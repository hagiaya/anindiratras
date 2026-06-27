import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPolicy() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-white shadow-sm px-4 py-4 flex items-center sticky top-0 z-10 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="mr-4 text-gray-600 hover:text-gray-900">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-semibold text-gray-800">Kebijakan Privasi</h1>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto p-6 md:p-8">
        <div className="prose prose-blue max-w-none text-gray-700 space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Kebijakan Privasi Anindira Trans</h2>
          
          <p className="text-sm text-gray-500 mb-8">Terakhir diperbarui: 27 Juni 2026</p>

          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">1. Pendahuluan</h3>
            <p>
              Selamat datang di Anindira Trans. Kami sangat menghargai privasi Anda dan berkomitmen untuk melindungi informasi pribadi Anda. 
              Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, mengungkapkan, dan menjaga informasi Anda saat 
              Anda menggunakan aplikasi seluler dan situs web kami.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">2. Informasi yang Kami Kumpulkan</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-600 mt-2">
              <li><strong>Informasi Pribadi:</strong> Nama, alamat email, nomor telepon, dan foto profil saat Anda mendaftar.</li>
              <li><strong>Data Lokasi:</strong> Kami mengumpulkan data lokasi real-time Anda untuk memungkinkan layanan pelacakan perjalanan, pemesanan, dan fitur keselamatan baik bagi pengguna maupun pengemudi.</li>
              <li><strong>Data Transaksi:</strong> Informasi terkait pemesanan layanan (Carpool, Paket, Bandara, Rental), titik jemput dan tujuan, serta rincian pembayaran.</li>
              <li><strong>Informasi Perangkat:</strong> Model perangkat keras, sistem operasi, alamat IP, dan pengidentifikasi perangkat unik.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">3. Bagaimana Kami Menggunakan Informasi Anda</h3>
            <p>Kami menggunakan informasi yang dikumpulkan untuk:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2 text-gray-600">
              <li>Menyediakan, memelihara, dan meningkatkan layanan transportasi kami.</li>
              <li>Memfasilitasi komunikasi antara pengemudi dan penumpang, termasuk melalui fitur chat dan panggilan dalam aplikasi.</li>
              <li>Memproses transaksi pembayaran.</li>
              <li>Memberikan dukungan pelanggan dan merespons pertanyaan.</li>
              <li>Mengirimkan pemberitahuan penting terkait layanan, promo, dan pembaruan keamanan.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">4. Pembagian Informasi</h3>
            <p>
              Kami dapat membagikan informasi Anda dengan pihak-pihak berikut:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-2 text-gray-600">
              <li><strong>Pengemudi/Mitra:</strong> Hanya informasi yang diperlukan seperti lokasi jemput/tujuan dan nama untuk memfasilitasi perjalanan.</li>
              <li><strong>Penyedia Layanan Pihak Ketiga:</strong> Untuk proses pembayaran, analitik, dan layanan infrastruktur server.</li>
              <li><strong>Kewajiban Hukum:</strong> Jika diwajibkan oleh hukum atau permintaan resmi dari otoritas penegak hukum.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">5. Penghapusan Data</h3>
            <p>
              Anda memiliki hak untuk meminta penghapusan data pribadi Anda dari sistem kami kapan saja. 
              Anda dapat melakukan hal ini dengan mengunjungi halaman <a href="/permintaanhapusdata" className="text-blue-600 hover:underline">Permintaan Hapus Data</a> dan mengisi formulir yang disediakan. Permintaan Anda akan diproses maksimal dalam waktu 14 hari kerja.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">6. Keamanan Data</h3>
            <p>
              Kami menggunakan langkah-langkah keamanan teknis dan administratif yang dirancang untuk melindungi 
              informasi Anda dari kehilangan, pencurian, penyalahgunaan, dan akses tanpa izin.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">7. Hubungi Kami</h3>
            <p>
              Jika Anda memiliki pertanyaan atau kekhawatiran tentang Kebijakan Privasi ini, silakan hubungi layanan pelanggan kami melalui aplikasi.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
