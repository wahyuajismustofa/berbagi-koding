const SCRIPT_BASE_URL = "https://script.google.com/macros/s/AKfycbwZ_spsPzVJ_VC4y_mgYjUvFHYAagYjMseFTODgZUG1QXQZtKdlAxiuaVVXQ4HjaMN8rw/exec";

/**
 * Fallback jika showAlert belum didefinisikan
 */
if (typeof window.showAlert !== "function") {
  window.showAlert = (msg, type = "info") => {
    console.log(`[${type.toUpperCase()}] ${msg}`);
    alert(msg);
  };
}

/**
 * Format dan encode key/value untuk query update
 */
export function encodeCustom(text) {
  return text.trim().replace(/ /g, "_").replace(/,/g, "--koma--");
}

/**
 * Helper untuk mendapatkan waktu format Indonesia
 */
export function getCurrentTimestamp() {
  const now = new Date();

  // Tambahkan offset 7 jam (dalam milidetik)
  const offsetMillis = 7 * 60 * 60 * 1000;
  const wibTime = new Date(now.getTime() + offsetMillis);

  const pad = (num) => num.toString().padStart(2, "0");

  const year = wibTime.getUTCFullYear();
  const month = pad(wibTime.getUTCMonth() + 1);
  const day = pad(wibTime.getUTCDate());

  const hours = pad(wibTime.getUTCHours());
  const minutes = pad(wibTime.getUTCMinutes());
  const seconds = pad(wibTime.getUTCSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}


/**
 * Fungsi utama untuk mengirim data form ke Google Apps Script
 */
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

  if (waktuInput) {
    waktuInput.value = getCurrentTimestamp();
  }

  const formData = new FormData(form);
  const updateFields = [];

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

/**
 * Inisialisasi handler untuk form
 */
export function setupFormHandler(formId, validateFn) {
  const form = document.getElementById(formId);
  if (!form) {
    console.warn(`Form dengan ID '${formId}' tidak ditemukan.`);
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const isValid = validateFn ? validateFn(form) : true;
    if (isValid === false) return;

    const result = await handleFormSubmit(event);

    // Gunakan fallback alert jika tidak tersedia
    const type = result.status ? "success" : "error";
    showAlert(result.message, type);

    // Kirim event custom
    form.dispatchEvent(new CustomEvent("form-submitted", {
      detail: result,
      bubbles: true,
    }));
  });
}
