import pandas as pd
import numpy as np
import statsmodels.api as sm
import matplotlib.pyplot as plt
import seaborn as sns

# === 1. Baca dan siapkan data ===
# Otomatisasi sheet: pakai sheet pertama jika tidak tahu nama sheet
df = pd.read_excel("data-input.xlsx", sheet_name=0)

# Otomatisasi deteksi kolom dummy dan kontrol
dummy_hari = [col for col in df.columns if col.startswith('Dummy_Date_of_Publication')]
dummy_post_type = [col for col in df.columns if col.startswith('Dummy_of_Post_Type')]
dummy_post_appeal = [col for col in df.columns if col.startswith('Dummy_of_Post_Appeal')]
kontrol = [col for col in ['Caption_Length', 'Public_Holiday'] if col in df.columns]

# Siapkan X (semua kolom dummy kategori + kontrol)
X = df[dummy_hari + dummy_post_type + dummy_post_appeal + kontrol].copy()

# Pastikan Interactivity numerik 0/1 jika ada
if 'Interactivity' in X.columns:
    X['Interactivity'] = X['Interactivity'].apply(lambda x: 1 if x == 1 else 0)

# Tidak perlu mapping kategori, langsung gunakan kolom dummy

# Pastikan semua numerik (kecuali kolom string, jika ada)
for col in X.columns:
    if X[col].dtype == object:
        try:
            X[col] = X[col].astype(float)
        except:
            pass

X_encoded = sm.add_constant(X)
X_encoded = X_encoded.astype(float)


# Ganti koma dengan titik dan ubah ke float
df['LN_Likes'] = df['LN_Likes'].astype(str).str.replace(',', '.').astype(float)
df['LN_Comments'] = df['LN_Comments'].astype(str).str.replace(',', '.').astype(float)



# ...existing code...


# === 5. Model regresi untuk LN_Likes ===
y_likes = df['LN_Likes']
model_likes = sm.OLS(y_likes, X_encoded).fit()

# === 6. Model regresi untuk LN_Comments ===
y_comments = df['LN_Comments']
model_comments = sm.OLS(y_comments, X_encoded).fit()



# === 7. Tampilkan hasil dan simpan ke file output.txt ===
import re
import sys
import io


# Simpan seluruh data (df) yang terbaca ke file Excel (xlsx)
df.to_excel('data-terbaca.xlsx', index=False, engine='openpyxl')

output = io.StringIO()
sys.stdout = output

# === Penjelasan proses, metode, dan rumus ===
print("""
=== PENJELASAN PROSES DAN METODE ===
1. Data dibaca dari file Excel (data-input.xlsx, sheet pertama), lalu kolom numerik dikonversi ke float.
2. Variabel independen yang digunakan adalah seluruh kolom dummy kategori (Dummy_Date_of_Publication*, Dummy_of_Post_Type*, Dummy_of_Post_Appeal*) dan variabel kontrol Caption_Length serta Public_Holiday.
3. Semua variabel dummy kategori sudah dalam bentuk 0/1, sehingga tidak perlu mapping atau encoding tambahan.
4. Model regresi linier berganda dibangun menggunakan metode Ordinary Least Squares (OLS) dari statsmodels, dengan semua variabel dummy dan kontrol dimasukkan sekaligus.
5. Model dijalankan untuk dua target: LN_Likes dan LN_Comments.
6. Hasil model (koefisien, p-value, R-squared, dst) ditampilkan dan disimpan ke output.txt.
7. Analisis variabel paling signifikan dilakukan untuk tiap kelompok variabel (hari, tipe post, post appeal, kontrol).

=== METODE YANG DIGUNAKAN ===
- Regresi Linier Berganda (Multiple Linear Regression) dengan Ordinary Least Squares (OLS).
- OLS mencari koefisien regresi yang meminimalkan jumlah kuadrat selisih antara nilai aktual dan prediksi.

=== RUMUS MATEMATIKA ===
Model regresi linier berganda:
    Y = β₀ + β₁X₁ + β₂X₂ + ... + βₙXₙ + ε
Keterangan:
- Y = variabel dependen (LN_Likes atau LN_Comments)
- X₁, X₂, ..., Xₙ = variabel independen (seluruh dummy hari, tipe post, post appeal, Caption_Length, Public_Holiday)
- β₀ = intersep (konstanta)
- β₁, β₂, ..., βₙ = koefisien regresi
- ε = error (residual)
Koefisien β dicari dengan meminimalkan:
    Σ(Yᵢ - (β₀ + β₁X₁ᵢ + ... + βₙXₙᵢ))²
""")

print("\n===== MODEL REGRESI: LN_LIKES =====")
print(model_likes.summary())

print("\n===== MODEL REGRESI: LN_COMMENTS =====")
print(model_comments.summary())

print(f"\nJumlah data yang dianalisis: {len(df)} baris")

# Tambahkan penjelasan rumus regresi aktual ke file output.txt
def tulis_rumus_regresi(model, nama_target, file):
    params = model.params
    rumus = f"{nama_target} = "
    rumus += f"{params['const']:.4f}"
    for var in params.index:
        if var != 'const':
            rumus += f" + ({params[var]:.4f} * {var})"
    rumus += " + ε\n"
    file.write(f"\n=== RUMUS REGRESI AKTUAL UNTUK {nama_target.upper()} ===\n{rumus}\n")

kelompok = {
    'Hari': [col for col in X_encoded.columns if col.startswith('Dummy_Date_of_Publication_')],
    'Tipe Post': [col for col in X_encoded.columns if col.startswith('Dummy_of_Post_Type_')],
    'Post Appeal': [col for col in X_encoded.columns if col.startswith('Dummy_of_Post_Appeal_')],
    'Interactivity': ['Interactivity']
}

def analisis_signifikan_kontrol(model, nama_target, X_encoded):
    print(f"\n=== KESIMPULAN VARIABEL PALING SIGNIFIKAN UNTUK {nama_target.upper()} (dengan variabel kontrol tetap) ===")
    for nama, kolom2 in kelompok.items():
        paling_signifikan = None
        pval_terkecil = 1.1
        efek = None
        for col in kolom2:
            if col in model.pvalues:
                pval = model.pvalues[col]
                if pval < pval_terkecil:
                    pval_terkecil = pval
                    paling_signifikan = col
                    efek = model.params[col]
        if paling_signifikan and pval_terkecil < 0.05:
            nama_singkat = paling_signifikan.split('_')[-1]
            print(f"{nama}: {nama_singkat} (p-value: {pval_terkecil:.4f}, koefisien: {efek:.4f})")
        else:
            print(f"{nama}: Tidak ada yang signifikan (p-value < 0.05)")

analisis_signifikan_kontrol(model_likes, "LN_Likes", X_encoded)
analisis_signifikan_kontrol(model_comments, "LN_Comments", X_encoded)

sys.stdout = sys.__stdout__

# Simpan semua perhitungan lengkap ke file perhitungan.txt
with open("perhitungan.txt", "w", encoding="utf-8") as f:
    f.write("=== RINCIAN PERHITUNGAN REGRESI LINIER BERGANDA ===\n\n")
    f.write("--- Matriks Input (X) yang digunakan (termasuk konstanta) ---\n")
    f.write(X_encoded.to_string())
    f.write("\n\n--- Target LN_Likes ---\n")
    f.write(df['LN_Likes'].to_string())
    f.write("\n\n--- Target LN_Comments ---\n")
    f.write(df['LN_Comments'].to_string())
    f.write("\n\n--- Koefisien Model LN_Likes ---\n")
    f.write(model_likes.params.to_string())
    f.write("\n\n--- Koefisien Model LN_Comments ---\n")
    f.write(model_comments.params.to_string())
    f.write("\n\n--- Perhitungan Prediksi LN_Likes (Y_hat) ---\n")
    yhat_likes = model_likes.predict(X_encoded)
    f.write(yhat_likes.to_string())
    f.write("\n\n--- Perhitungan Prediksi LN_Comments (Y_hat) ---\n")
    yhat_comments = model_comments.predict(X_encoded)
    f.write(yhat_comments.to_string())
    f.write("\n\n--- Residual LN_Likes (Y - Y_hat) ---\n")
    resid_likes = df['LN_Likes'] - yhat_likes
    f.write(resid_likes.to_string())
    f.write("\n\n--- Residual LN_Comments (Y - Y_hat) ---\n")
    resid_comments = df['LN_Comments'] - yhat_comments
    f.write(resid_comments.to_string())
    f.write("\n\n--- Summary Model LN_Likes ---\n")
    f.write(str(model_likes.summary()))
    f.write("\n\n--- Summary Model LN_Comments ---\n")
    f.write(str(model_comments.summary()))

# Tambahkan penjelasan variabel kontrol secara otomatis
daftar_kontrol = kontrol.copy()
if daftar_kontrol:
    kontrol_str = ', '.join(daftar_kontrol)
    penjelasan_kontrol = f"""
=== PENJELASAN TENTANG VARIABEL KONTROL ===\nPada model regresi linier berganda ini, variabel kontrol seperti {kontrol_str} dimasukkan bersama variabel independen lainnya. Artinya, setiap koefisien yang dihasilkan sudah mencerminkan pengaruh bersih dari masing-masing variabel, setelah memperhitungkan (mengontrol) pengaruh variabel lain yang ada di model. Dengan demikian, pengaruh variabel dummy kategori yang ditampilkan adalah pengaruh parsial, yaitu pengaruh variabel tersebut dengan asumsi variabel kontrol tetap.\n"""
else:
    penjelasan_kontrol = """
=== PENJELASAN TENTANG VARIABEL KONTROL ===\nPada model ini tidak terdapat variabel kontrol tambahan selain variabel independen utama.\n"""

with open("output.txt", "w", encoding="utf-8") as f:
    f.write(output.getvalue())
    f.write("\n" + penjelasan_kontrol + "\n")
    tulis_rumus_regresi(model_likes, "LN_Likes", f)
    tulis_rumus_regresi(model_comments, "LN_Comments", f)


# Buat DataFrame hasil untuk keperluan grafik dan penjelasan saja (tidak disimpan ke Excel)
hasil_likes = pd.DataFrame({
    'Variabel': model_likes.params.index,
    'Koefisien_LN_Likes': model_likes.params.values,
    'P_Value_LN_Likes': model_likes.pvalues.values
})
hasil_likes['Signifikan_LN_Likes'] = hasil_likes['P_Value_LN_Likes'] < 0.05

hasil_comments = pd.DataFrame({
    'Variabel': model_comments.params.index,
    'Koefisien_LN_Comments': model_comments.params.values,
    'P_Value_LN_Comments': model_comments.pvalues.values
})
hasil_comments['Signifikan_LN_Comments'] = hasil_comments['P_Value_LN_Comments'] < 0.05

# Gabungkan hasil
hasil = pd.merge(hasil_likes, hasil_comments, on='Variabel', how='outer')

# Filter variabel independen yang signifikan pada salah satu model
signifikan = hasil[(hasil['Signifikan_LN_Likes']) | (hasil['Signifikan_LN_Comments'])]
# Kecualikan baris 'const' (intersep)
signifikan = signifikan[signifikan['Variabel'] != 'const']

# Penjelasan variabel signifikan dan arti koefisien
with open("output.txt", "a", encoding="utf-8") as f:
    f.write("\n\n=== PENJELASAN VARIABEL INDEPENDEN YANG SIGNIFIKAN ===\n")
    if signifikan.empty:
        f.write("Tidak ada variabel independen yang signifikan pada model LN_Likes maupun LN_Comments.\n")
    else:
        for _, row in signifikan.iterrows():
            f.write(f"- {row['Variabel']}:\n")
            if row['Signifikan_LN_Likes']:
                f.write(f"  Pada model LN_Likes, koefisien = {row['Koefisien_LN_Likes']:.4f}, p-value = {row['P_Value_LN_Likes']:.4f}. Artinya, jika variabel ini naik 1 satuan (atau berubah dari 0 ke 1 untuk dummy), maka LN_Likes akan berubah sebesar koefisien tersebut, dengan tingkat signifikansi p-value.\n")
            if row['Signifikan_LN_Comments']:
                f.write(f"  Pada model LN_Comments, koefisien = {row['Koefisien_LN_Comments']:.4f}, p-value = {row['P_Value_LN_Comments']:.4f}. Artinya, jika variabel ini naik 1 satuan (atau berubah dari 0 ke 1 untuk dummy), maka LN_Comments akan berubah sebesar koefisien tersebut, dengan tingkat signifikansi p-value.\n")
    f.write("\nKeterangan:\n")
    f.write("- Koefisien_LN_Likes: Besarnya pengaruh variabel terhadap LN_Likes (log natural dari Likes).\n")
    f.write("- P_Value_LN_Likes: Nilai p-value untuk uji signifikansi pada model LN_Likes. Jika < 0.05, pengaruh signifikan.\n")
    f.write("- Koefisien_LN_Comments: Besarnya pengaruh variabel terhadap LN_Comments (log natural dari Comments).\n")
    f.write("- P_Value_LN_Comments: Nilai p-value untuk uji signifikansi pada model LN_Comments. Jika < 0.05, pengaruh signifikan.\n")
    f.write("- Nilai koefisien positif berarti menaikkan variabel tersebut akan menaikkan engagement, nilai negatif berarti menurunkan engagement.\n")

# Grafik batang koefisien variabel signifikan LN_Likes
if not signifikan.empty:
    # Grafik batang koefisien variabel signifikan LN_Likes dan LN_Comments (semua variabel signifikan)
    plt.figure(figsize=(8, 5))
    sns.barplot(
        x='Koefisien_LN_Likes',
        y='Variabel',
        data=signifikan,
        color=sns.color_palette('viridis', n_colors=1)[0],
        orient='h'
    )
    plt.title('Koefisien Variabel Signifikan terhadap LN_Likes')
    plt.xlabel('Koefisien')
    plt.ylabel('Variabel')
    plt.tight_layout()
    plt.savefig('grafik_koefisien_LN_Likes.png', dpi=300)
    plt.close()

    plt.figure(figsize=(8, 5))
    sns.barplot(
        x='Koefisien_LN_Comments',
        y='Variabel',
        data=signifikan,
        color=sns.color_palette('magma', n_colors=1)[0],
        orient='h'
    )
    plt.title('Koefisien Variabel Signifikan terhadap LN_Comments')
    plt.xlabel('Koefisien')
    plt.ylabel('Variabel')
    plt.tight_layout()
    plt.savefig('grafik_koefisien_LN_Comments.png', dpi=300)
    plt.close()

    # Grafik per kategori variabel independen yang signifikan
    kategori_dict = {
        'Dummy_Date_of_Publication': 'Dummy_Date_of_Publication_',
        'Dummy_of_Post_Type': 'Dummy_of_Post_Type_',
        'Dummy_of_Post_Appeal': 'Dummy_of_Post_Appeal_',
        'Interactivity': 'Interactivity'
    }

    for kategori, prefix in kategori_dict.items():
        # LN_Likes: cek apakah ada minimal satu variabel kategori signifikan
        signifikan_kat_likes = signifikan[(signifikan['Signifikan_LN_Likes']) & (signifikan['Variabel'].str.startswith(prefix))]
        semua_kat_likes = hasil_likes[hasil_likes['Variabel'].str.startswith(prefix)]
        if not signifikan_kat_likes.empty and not semua_kat_likes.empty:
            plt.figure(figsize=(7, 4))
            sns.barplot(
                x='Koefisien_LN_Likes',
                y='Variabel',
                data=semua_kat_likes,
                color=sns.color_palette('viridis', n_colors=1)[0],
                orient='h'
            )
            plt.title(f'Koefisien Seluruh {kategori} terhadap LN_Likes')
            plt.xlabel('Koefisien')
            plt.ylabel('Variabel')
            plt.tight_layout()
            plt.savefig(f'grafik_{kategori.lower()}_semua_LN_Likes.png', dpi=300)
            plt.close()
        # LN_Comments: cek apakah ada minimal satu variabel kategori signifikan
        signifikan_kat_comments = signifikan[(signifikan['Signifikan_LN_Comments']) & (signifikan['Variabel'].str.startswith(prefix))]
        semua_kat_comments = hasil_comments[hasil_comments['Variabel'].str.startswith(prefix)]
        if not signifikan_kat_comments.empty and not semua_kat_comments.empty:
            plt.figure(figsize=(7, 4))
            sns.barplot(
                x='Koefisien_LN_Comments',
                y='Variabel',
                data=semua_kat_comments,
                color=sns.color_palette('magma', n_colors=1)[0],
                orient='h'
            )
            plt.title(f'Koefisien Seluruh {kategori} terhadap LN_Comments')
            plt.xlabel('Koefisien')
            plt.ylabel('Variabel')
            plt.tight_layout()
            plt.savefig(f'grafik_{kategori.lower()}_semua_LN_Comments.png', dpi=300)
            plt.close()

