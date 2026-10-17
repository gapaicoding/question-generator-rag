import os

import requests
import streamlit as st


API_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")

st.set_page_config(page_title="Ruang Soal", page_icon="📚", layout="centered")
st.markdown(
    """
    <style>
      .block-container {max-width: 920px; padding-top: 2.2rem; padding-bottom: 4rem;}
      h1 {letter-spacing: -.04em;}
      div[data-testid="stMetric"] {background: #f4f7f4; padding: 14px 16px; border-radius: 12px;}
      .stButton button[kind="primary"] {border-radius: 9px;}
      div[data-testid="stExpander"] {border-radius: 10px;}
    </style>
    """,
    unsafe_allow_html=True,
)

if "document" not in st.session_state:
    st.session_state.document = None


def api_error_message(error, action):
    if isinstance(error, requests.HTTPError):
        try:
            detail = error.response.json().get("detail", "")
        except (ValueError, AttributeError):
            detail = ""
        if detail == "Ollama service is unavailable.":
            return "Ollama belum berjalan. Buka terminal lain dan jalankan `ollama serve`."
        if detail == "Required Ollama model is not installed.":
            return "Model Ollama belum terpasang. Periksa `OLLAMA_EMBED_MODEL` dan `OLLAMA_LLM_MODEL` di `.env`, lalu unduh model yang tercantum dengan `ollama pull <nama-model>`."
        if detail == "PDF contains no extractable text.":
            return "PDF ini tidak memiliki teks yang bisa dibaca. Jika berupa hasil scan, lakukan OCR lalu unggah PDF yang sudah memiliki teks."
        if detail == "PDF is corrupted or invalid.":
            return "PDF rusak atau formatnya tidak valid. Buka lalu ekspor ulang sebagai PDF, kemudian coba lagi."
        if detail == "PDF exceeds the 25 MB limit.":
            return "Ukuran PDF melebihi 25 MB. Kompres file atau unggah versi yang lebih kecil."
        if detail == "Only PDF files are accepted.":
            return "Format file tidak didukung. Pilih file dengan format PDF."
        if detail == "Document not found.":
            return "Indeks dokumen tidak ditemukan. Unggah ulang PDF untuk melanjutkan."
        if detail == "No relevant source material found for this topic.":
            return "Materi yang cocok belum ditemukan. Coba prompt yang lebih spesifik pada isi PDF atau gunakan istilah dari dokumen."
        if isinstance(detail, str) and detail.startswith("Requested section was not found"):
            return "Bagian yang diminta tidak ditemukan di indeks PDF. Unggah ulang dokumen terbaru atau pilih cakupan lain yang terdeteksi."
        if isinstance(detail, str) and detail.startswith("Retrieved source material is too short"):
            return "Bukti dari PDF terlalu sedikit untuk jumlah soal tersebut. Pilih bagian yang lebih luas atau kurangi jumlah soal."
        if detail == "LLM returned invalid structured output.":
            return "Model belum menghasilkan format soal yang valid setelah dicoba ulang. Coba sekali lagi atau pilih jumlah soal yang lebih sedikit."
        if isinstance(detail, str) and "timed out" in detail.lower():
            return "Ollama terlalu lama merespons. Pastikan model sudah dimuat dan coba jumlah soal yang lebih sedikit."
        return detail if isinstance(detail, str) and detail else f"{action} gagal (HTTP {error.response.status_code})."
    if isinstance(error, requests.Timeout):
        return f"{action} melewati batas waktu. Pastikan Ollama dan model lokal berjalan, lalu coba lagi."
    if isinstance(error, requests.RequestException):
        return f"Tidak bisa menghubungi API di {API_URL}. Pastikan API FastAPI sedang berjalan."
    return f"{action} gagal: {error}"


def show_api_error(action, error):
    st.error(api_error_message(error, action))


def request_with_status(action, label, steps, method, path, success_label, **kwargs):
    with st.status(label, expanded=True) as progress:
        for step in steps:
            progress.write(step)
        try:
            response = requests.request(method, f"{API_URL}{path}", **kwargs)
            response.raise_for_status()
        except requests.RequestException as error:
            progress.update(label=f"{action} belum berhasil", state="error", expanded=True)
            show_api_error(action, error)
            return None
        progress.update(label=success_label, state="complete", expanded=True)
        return response.json()

st.title("📚 Ruang Soal")
st.write("Ubah materi PDF menjadi pencarian dan soal latihan yang punya sumber halaman.")

with st.sidebar:
    st.subheader("Layanan")
    try:
        health_response = requests.get(f"{API_URL}/health", timeout=4)
        health_response.raise_for_status()
        health = health_response.json()
        if health.get("ollama"):
            st.success("API dan layanan Ollama terhubung")
        else:
            st.warning("API aktif, tetapi Ollama belum berjalan. Jalankan `ollama serve`.")
    except requests.RequestException:
        st.error("API tidak terhubung. Pastikan `uvicorn backend.main:app --reload` sedang berjalan.")
    st.caption(f"API: {API_URL}")
    st.divider()
    st.caption("PDF diproses oleh API lokal. Batas ukuran file 25 MB.")

st.header("1. Tambahkan materi")
uploaded_file = st.file_uploader("Pilih file PDF", type=["pdf"], max_upload_size=25, help="Pilih PDF berbasis teks, maksimal 25 MB.")
if st.button("Unggah dan proses PDF", type="primary", disabled=uploaded_file is None):
    document = request_with_status(
        "Unggah dan indeks PDF",
        f"Mengunggah {uploaded_file.name} dan menyiapkan indeks…",
        [
            "Mengirim file PDF ke API lokal.",
            "API memvalidasi file dan mengekstrak teks dari setiap halaman.",
            "API membuat embedding lalu menyimpan indeks agar bisa dicari.",
        ],
        "POST",
        "/documents",
        "PDF berhasil diindeks dan siap digunakan",
        files={"file": (uploaded_file.name, uploaded_file.getvalue(), "application/pdf")},
        timeout=600,
    )
    if document:
        previous = st.session_state.document
        st.session_state.document = document
        if previous and previous.get("document_id") != document["document_id"]:
            try:
                requests.delete(f"{API_URL}/documents/{previous['document_id']}", timeout=30)
            except requests.RequestException:
                pass
        st.success(f"{document['filename']} siap dipakai.")

document = st.session_state.document
if document:
    st.info(f"**{document['filename']}** · {document['pages']} halaman · {document['chunks']} bagian terindeks")
    if document.get("sections"):
        st.caption("Bagian yang terdeteksi saat indeks: " + ", ".join(document["sections"]))
    else:
        st.caption("Tidak ada heading bagian yang dikenali. Pencarian soal memakai seluruh dokumen; tulis fokus materi pada prompt, bukan nomor lesson.")
    if st.button("Hapus dokumen aktif"):
        deleted = request_with_status(
            "Penghapusan dokumen",
            f"Menghapus indeks {document['filename']}…",
            ["Menghapus indeks pencarian dan file PDF tersimpan."],
            "DELETE",
            f"/documents/{document['document_id']}",
            "Dokumen berhasil dihapus",
            timeout=30,
        )
        if deleted:
            st.session_state.document = None
            st.success("Dokumen sudah dihapus.")
            st.rerun()
else:
    st.caption("Unggah satu PDF untuk mengaktifkan pencarian dan pembuatan soal.")

st.divider()
search_tab, quiz_tab = st.tabs(["🔎 Cari isi PDF", "✏️ Buat soal"])

with search_tab:
    st.header("Cari di dokumen")
    query = st.text_input("Apa yang ingin kamu cari?", placeholder="Contoh: Bagaimana proses fotosintesis?")
    if st.button("Cari", disabled=not document, key="search_button"):
        if not query.strip():
            st.warning("Masukkan kata atau pertanyaan untuk dicari.")
        else:
            data = request_with_status(
                "Pencarian",
                "Mencari bagian yang relevan…",
                ["Membuat embedding pertanyaan.", "Mencocokkan pertanyaan dengan indeks dokumen."],
                "POST",
                "/search",
                "Pencarian selesai",
                json={"document_id": document["document_id"], "query": query.strip(), "top_k": 5},
                timeout=120,
            )
            if data:
                results = data["results"]
                if not results:
                    st.info("Belum ada bagian yang cocok.")
                for result in results:
                    with st.container(border=True):
                        st.write(result["content"])
                        st.caption(f"Halaman {result['page']} · jarak semantik {result['distance']:.3f}")

with quiz_tab:
    st.header("Buat soal latihan")
    sections = document.get("sections", []) if document else []
    section_options = ["Seluruh dokumen", *sections]
    section_key = f"quiz_scope_{document['document_id']}" if document else "quiz_scope_none"
    selected_section = st.selectbox(
        "Cakupan materi",
        section_options,
        key=section_key,
        help="Pilih lesson atau bagian agar pencarian dan soal tidak mengambil materi dari bagian lain.",
        disabled=not document,
    )
    prompt = st.text_area(
        "Prompt kamu apa?",
        placeholder="Contoh: Fokus pada greeting, menanyakan nama, asal kota, dan umur.",
        help="Tulis fokus atau arahan soal. Nomor lesson hanya dapat dipakai jika heading-nya terdeteksi di PDF. Jawaban tetap harus didukung PDF.",
        max_chars=500,
        key="quiz_prompt",
    )
    difficulty_label = st.selectbox("Kesulitan", ["Mudah", "Menengah", "Sulit"])
    difficulty = {"Mudah": "easy", "Menengah": "medium", "Sulit": "hard"}[difficulty_label]
    question_count = st.number_input("Jumlah soal", min_value=1, max_value=20, value=5, step=1)
    if st.button("Buat soal", type="primary", disabled=not document, key="generate_button"):
        if not prompt.strip():
            st.warning("Tulis prompt atau fokus materi soal terlebih dahulu.")
        else:
            data = request_with_status(
                "Pembuatan soal",
                "Mencari sumber dan menyusun soal…",
                [
                    f"Mencari bagian yang relevan di {selected_section.lower()}.",
                    f"Menyusun {question_count} soal tingkat {difficulty_label.lower()} menggunakan Ollama.",
                    "Memastikan konteks cukup, memeriksa pilihan jawaban, dan melampirkan referensi halaman.",
                ],
                "POST",
                "/generate",
                "Soal selesai dibuat dan sumber sudah dilampirkan",
                json={
                    "document_id": document["document_id"],
                    "topic": prompt.strip(),
                    "scope": selected_section if selected_section != "Seluruh dokumen" else None,
                    "question_count": question_count,
                    "difficulty": difficulty,
                    "type": "multiple_choice",
                },
                timeout=600,
            )
            if data:
                questions = data["questions"]
                st.success(f"{len(questions)} soal selesai dibuat.")
                for index, question in enumerate(questions, start=1):
                    with st.container(border=True):
                        st.markdown(f"**{index}. {question['question']}**")
                        for letter, option in zip("ABCD", question["options"]):
                            st.write(f"{letter}. {option}")
                        with st.expander("Lihat jawaban dan sumber"):
                            st.markdown(f"**Jawaban:** {question['answer']}")
                            st.write(question["explanation"])
                            pages = ", ".join(str(source["page"]) for source in question["sources"])
                            st.caption(f"Sumber: halaman {pages}")

st.divider()
st.caption("Ruang Soal · Berjalan secara lokal")
