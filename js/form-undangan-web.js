// ==================== FORM HANDLER UNIVERSAL (Final) ====================
const SCRIPT_BASE_URL = "https://script.google.com/macros/s/AKfycbwZ_spsPzVJ_VC4y_mgYjUvFHYAagYjMseFTODgZUG1QXQZtKdlAxiuaVVXQ4HjaMN8rw/exec";

// Fallback alert jika belum didefinisikan
if (typeof window.showAlert !== "function") {
  window.showAlert = (msg, type = "info") => {
    console.log(`[${type.toUpperCase()}] ${msg}`);
    alert(msg);
  };
}

// Encode nama dan nilai untuk query update
export function encodeCustom(text) {
  return text.trim().replace(/ /g, "_").replace(/,/g, "--koma--");
}

// Ambil waktu sekarang dalam format WIB
export function getCurrentTimestamp() {
  const now = new Date();
  const offsetMillis = 7 * 60 * 60 * 1000; // WIB offset
  const wibTime = new Date(now.getTime() + offsetMillis);

  const pad = (num) => num.toString().padStart(2, "0");

  const day = pad(wibTime.getUTCDate());
  const month = pad(wibTime.getUTCMonth() + 1);
  const year = wibTime.getUTCFullYear();
  const hours = pad(wibTime.getUTCHours());
  const minutes = pad(wibTime.getUTCMinutes());
  const seconds = pad(wibTime.getUTCSeconds());

  // Format untuk Google Sheets yang aman: DD/MM/YYYY HH:mm:ss
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}


export function defaultValidateFn(form) {
    // 1. Sinkronisasi nilai input ke input hidden
    const inputs = form.querySelectorAll("input, textarea, select");
    const checkboxGroups = {};

    for (const input of inputs) {
    const name = input.name;
    if (!name) continue;

    // Tangani checkbox array seperti acara[]
    if (name.endsWith("[]")) {
        if (!checkboxGroups[name]) checkboxGroups[name] = [];
        if (input.checked) checkboxGroups[name].push(input.value);
        continue;
    }

    // Sinkronisasi biasa (non-checkbox array)
    if ((input.type === "radio" || input.type === "checkbox") && !input.checked) continue;

    const hidden = form.querySelector(`input[type="hidden"][name="${name}"]`);
    if (hidden && hidden !== input) {
        hidden.value = input.value;
    }
    }

    // Simpan nilai gabungan checkbox[] ke hidden
    for (const name in checkboxGroups) {
    const values = checkboxGroups[name];
    const flatName = name.replace(/\[\]$/, ""); // hilangkan [] dari akhir
    const hidden = form.querySelector(`input[type="hidden"][name="${flatName}"]`);
    if (hidden) {
        hidden.value = values.join(",");
    }
    }

  // 2. Validasi field required setelah sinkronisasi
  const requiredFields = form.querySelectorAll("[required]");
  for (const field of requiredFields) {
    // Jika field radio/checkbox, validasi grup-nya
    if (field.type === "radio" || field.type === "checkbox") {
      const group = form.querySelectorAll(`[name="${field.name}"]`);
      const anyChecked = Array.from(group).some(el => el.checked);
      if (!anyChecked) {
        const label = field.name
          .replace(/\[\]/g, "")
          .replace(/[_\-]/g, " ")
          .replace(/\b\w/g, c => c.toUpperCase());
        showAlert(`Silakan pilih ${label}.`, "error");
        return false;
      }
    } else {
      // Untuk input biasa
      if (!field.value.trim()) {
        const nameAttr = field.getAttribute("name") || "Field";
        const label = nameAttr
          .replace(/\[\]/g, "")
          .replace(/[_\-]/g, " ")
          .replace(/\b\w/g, c => c.toUpperCase());
        showAlert(`Silakan isi ${label}.`, "error");
        return false;
      }
    }
  }

  showAlert("Mengirim...", "info");
  return true;
}


// Fungsi kirim data ke Google Apps Script
export async function handleFormSubmit(event) {
  const form = event.target;
  event.preventDefault();

  const dbName = form.querySelector('[name="__db"]')?.value;
  const sheetName = form.querySelector('[name="__sheet"]')?.value;
  const whereKey = form.querySelector('[name="__key"]')?.value;
  const waktuInput = form.querySelector('[name="__waktu"]');

  if (!dbName || !sheetName || !whereKey) {
    return { status: false, message: "Konfigurasi form tidak lengkap." };
  }

  const keyInput = form.querySelector(`[name="${whereKey}"]`);
  if (!keyInput || !keyInput.value.trim()) {
    return { status: false, message: `Field '${whereKey}' tidak ditemukan atau kosong.` };
  }

  const whereValue = keyInput.value.trim();
  const formData = new FormData(form);
  const updateFields = [];

  if (waktuInput && waktuInput.value.trim()) {
    const waktuKey = encodeCustom(waktuInput.value.trim());
    const waktuVal = encodeURIComponent(encodeCustom(getCurrentTimestamp()));
    updateFields.push(`${waktuKey}=${waktuVal}`);
  }

  for (const [name, value] of formData.entries()) {
    if (name.startsWith("__")) continue;
    const key = encodeCustom(name);
    const val = encodeURIComponent(encodeCustom(value));
    updateFields.push(`${key}=${val}`);
  }

  const query = `UPDATE ${encodeCustom(sheetName)} SET ${updateFields.join(",")} WHERE ${encodeCustom(whereKey)}=${encodeCustom(whereValue)}`;
  const url = `${SCRIPT_BASE_URL}?conn=DATABASE=${dbName}&data=${query}`;

  try {
    const response = await fetch(url);
    const result = await response.json();
    if (result.status === true) {
      form.reset();
      return { status: true, message: "Data berhasil dikirim. Terima kasih!" };
    } else {
      return { status: false, message: "Gagal menyimpan data. Silakan coba lagi." };
    }
  } catch (error) {
    return { status: false, message: "Terjadi kesalahan saat mengirim data." };
  }
}

// Pasang handler submit ke form tertentu
export function setupFormHandler(formId, validateFn) {
  const form = document.getElementById(formId);
  if (!form) {
    console.warn(`Form dengan ID '${formId}' tidak ditemukan.`);
    return;
  }

  if (form._handlerAttached) return; // Hindari duplikasi
  form._handlerAttached = true;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const isValid = validateFn ? validateFn(form) : true;
    if (isValid === false) return;

    const result = await handleFormSubmit(event);
    const type = result.status ? "success" : "error";

    showAlert(result.message, type);

    form.dispatchEvent(new CustomEvent("form-submitted", {
      detail: result,
      bubbles: true,
    }));
  });
}

// Pasang handler ke semua form dengan ID
export function setupUniversalFormHandlers() {
  const forms = document.querySelectorAll("form[id]");

  forms.forEach((form) => {
    const formId = form.id;
    const praSubmitFnName = `praSubmit_${formId}`;
    const praSubmitFn = typeof window[praSubmitFnName] === "function" ? window[praSubmitFnName] : null;

    setupFormHandler(formId, (form) => {
      if (praSubmitFn && praSubmitFn() === false) {
        console.warn(`${praSubmitFnName} mengembalikan false.`);
        return false;
      }
      return defaultValidateFn(form);
    });

    form.addEventListener("form-submitted", (ev) => {
      const { status, message } = ev.detail || {};
      showAlert(status ? message || "Berhasil!" : message || "Gagal mengirim data.", status ? "success" : "error");
    });
  });
}

// Jalankan otomatis saat DOM siap
export function autoInitUniversalHandler() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupUniversalFormHandlers);
  } else {
    setupUniversalFormHandlers();
  }
}

// Inisialisasi otomatis
autoInitUniversalHandler();
