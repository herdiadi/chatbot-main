import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});

const GEMINI_API_KEY = "AIzaSyDmXtnyMtTp5BU9__GQ0-KNF6onYR6gkac";
const MODEL_NAME = "gemini-2.5-flash"; // Menggunakan 1.5-flash agar lebih stabil pada free tier
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  const lowerMsg = message.toLowerCase();

  // --- LOGIKA JAWABAN INSTAN (TANPA API) ---
  // Memeriksa kata kunci agar tidak menghabiskan kuota API 429

  if (lowerMsg.includes("lokasi") || lowerMsg.includes("dimana") || lowerMsg.includes("alamat")) {
    return res.json({ 
      reply: "📍 **Lokasi UNBARA:** Kampus Utama UNBARA terletak di Jl. Ratu Penghulu No.02, Karang Sari, Kec. Baturaja Timur, Kabupaten Ogan Komering Ulu, Sumatera Selatan." 
    });
  }

  if (lowerMsg.includes("prodi") || lowerMsg.includes("jurusan") || lowerMsg.includes("program studi")) {
    return res.json({ 
      reply: "🎓 **Program Studi di UNBARA:**\n\n• **FTK:** S1 Informatika, S1 Teknik Sipil.\n• **FEB:** S1 Manajemen, S1 Akuntansi.\n• **FKIP:** S1 Pend. Teknologi Informasi, S1 Pend. Bahasa Inggris, S1 Pend. Bahasa Indonesia.\n• **FISIP:** S1 Ilmu Komunikasi, S1 Ilmu Pemerintahan.\n• **Pertanian:** S1 Agroteknologi, S1 Agribisnis."
    });
  }

  if (lowerMsg.includes("biaya") || lowerMsg.includes("ukt") || lowerMsg.includes("bayar")) {
    return res.json({ 
      reply: "💰 **Biaya Kuliah:** Biaya di UNBARA bervariasi sesuai prodi (terdiri dari UKT, registrasi, dll). Informasi detail dapat dilihat di **pmb.unbara.ac.id** atau langsung ke gedung rektorat." 
    });
  }

  // --- TEMPLATE KONTEKS UNTUK PERTANYAAN LAIN ---
  const unbaraContext = `
    Kamu adalah IF-Bara, asisten pintar Program Studi Informatika Universitas Baturaja (UNBARA). 
    Jawablah pertanyaan user dengan ramah dan sopan.
  `;

  // --- JIKA TIDAK ADA DI TEMPLATE, BARU PANGGIL API GEMINI ---
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ text: unbaraContext + "\n\nPertanyaan User: " + message }] 
        }],
        generationConfig: {
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024
        }
      })
    });

    const data = await response.json();

    if (data.candidates && data.candidates.length > 0) {
      res.json({ reply: data.candidates[0].content.parts[0].text });
    } else {
      // Jika kuota habis (Error 429), berikan pesan fallback yang tetap informatif
      if(data.error && data.error.code === 429) {
        return res.json({ reply: "⚠️ Maaf, server AI sedang sibuk (Quota Limit). Silakan gunakan tombol menu cepat atau coba lagi dalam beberapa saat." });
      }
      res.status(500).json({ error: "Gagal memproses permintaan." });
    }
  } catch (err) {
    res.status(500).json({ error: "Terjadi kesalahan server." });
  }
});

app.listen(3000, () => {
  console.log("✅ Server IF-Bara berjalan di http://localhost:3000");
});
