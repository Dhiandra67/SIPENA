<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#f4f1ea">
    <title>SIPENA | Penilaian Akademik</title>
    <style>
        :root { color-scheme: light; font-family: "Segoe UI", Arial, sans-serif; color: #23332c; background: #f4f1ea; font-synthesis: none; text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; }
        * { box-sizing: border-box; }
        body { min-width: 320px; min-height: 100vh; margin: 0; background: radial-gradient(ellipse at 75% 4%, rgb(213 224 207 / 52%), transparent 35%), #f4f1ea; }
        .shell { width: min(100% - 48px, 1056px); min-height: 100vh; margin: auto; display: flex; flex-direction: column; }
        header { min-height: 88px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e4e3d9; }
        .brand { display: flex; align-items: center; gap: 11px; color: #233b30; font-size: 19px; font-weight: 800; letter-spacing: .045em; }
        .mark { width: 35px; height: 35px; display: grid; place-items: center; border-radius: 11px; background: #315b45; color: #fffdf6; }
        .muted, .intro { color: #69736b; }
        .top-label { color: #788078; font-size: 13px; }
        .welcome { max-width: 650px; margin: 105px 0 42px; }
        .eyebrow { margin: 0 0 13px; color: #718071; font-size: 11px; font-weight: 700; letter-spacing: .14em; }
        h1, h2 { font-family: "Segoe UI", Arial, sans-serif; }
        h1 { margin: 0 0 15px; font-size: clamp(32px, 5vw, 46px); letter-spacing: -.05em; line-height: 1.14; }
        .intro { max-width: 550px; margin: 0; font-size: 15px; line-height: 1.8; }
        .card { width: min(100%, 620px); padding: 27px 29px 20px; border: 1px solid #e8e7dd; border-radius: 18px; background: rgb(255 255 251 / 88%); box-shadow: 0 12px 40px rgb(46 60 49 / 5%); }
        .heading, .footer, .row, .pill, .value { display: flex; align-items: center; }
        .heading, .footer, .row { justify-content: space-between; }
        .heading { gap: 16px; padding-bottom: 21px; }
        .heading .eyebrow { margin-bottom: 5px; font-size: 10px; }
        h2 { margin: 0; font-size: 18px; letter-spacing: -.025em; }
        .pill { gap: 7px; padding: 7px 10px; border-radius: 20px; background: #edf4ec; color: #38644a; font-size: 11px; font-weight: 600; white-space: nowrap; }
        .pill.offline { background: #f9eeea; color: #a74d3e; }
        .pill.pending { background: #f3f0e5; color: #746438; }
        .dot, .service-dot { width: 7px; height: 7px; flex: 0 0 7px; border-radius: 50%; background: currentColor; }
        .services { border-top: 1px solid #ecebe3; }
        .row { min-height: 54px; border-bottom: 1px solid #ecebe3; color: #626d64; font-size: 13px; }
        .value { gap: 8px; color: #9c6256; font-size: 12px; }
        .value.healthy { color: #477354; }
        .service-dot { width: 6px; height: 6px; flex-basis: 6px; }
        .footer { gap: 12px; padding-top: 18px; color: #8a928b; font-size: 11px; }
        button { padding: 8px 13px; border: 0; border-radius: 8px; background: #315b45; color: #fffdf6; cursor: pointer; font: inherit; font-size: 11px; font-weight: 600; }
        button:hover:not(:disabled) { background: #244735; }
        button:disabled { cursor: wait; opacity: .65; }
        .bottom { margin-top: auto; padding: 50px 0 28px; color: #8a928b; font-size: 11px; }
        @media (max-width: 560px) { .shell { width: min(100% - 36px, 1056px); } header { min-height: 72px; } .top-label { max-width: 155px; text-align: right; } .welcome { margin-top: 72px; } .card { padding: 22px 19px 17px; } .footer { align-items: flex-start; } }
    </style>
</head>
<body>
    <main class="shell">
        <header>
            <div class="brand"><span class="mark">S</span><span>SIPENA</span></div>
            <span class="top-label">Sistem Informasi Penilaian Akademik</span>
        </header>
        <section class="welcome">
            <p class="eyebrow">SMP KARYA UTAMA</p>
            <h1>Selamat datang di SIPENA</h1>
            <p class="intro">Platform pengelolaan penilaian akademik. Periksa status aplikasi dan koneksi database sebelum mulai.</p>
        </section>
        <section class="card" aria-live="polite">
            <div class="heading">
                <div><p class="eyebrow">STATUS SISTEM</p><h2>Koneksi aplikasi</h2></div>
                <span id="overall" class="pill pending"><span class="dot"></span>Memeriksa</span>
            </div>
            <div class="services">
                <div class="row"><span>Aplikasi Laravel</span><span id="app-status" class="value"><span class="service-dot"></span>Aktif</span></div>
                <div class="row"><span>PostgreSQL</span><span id="db-status" class="value"><span class="service-dot"></span>Memeriksa...</span></div>
            </div>
            <div class="footer"><span id="checked-at">Menunggu pemeriksaan</span><button id="refresh" type="button">Periksa ulang</button></div>
        </section>
        <footer class="bottom">SIPENA · Membantu guru mengelola penilaian dengan lebih mudah</footer>
    </main>
    <script>
        const overall = document.querySelector("#overall");
        const database = document.querySelector("#db-status");
        const checkedAt = document.querySelector("#checked-at");
        const refresh = document.querySelector("#refresh");

        async function checkHealth() {
            refresh.disabled = true;
            refresh.textContent = "Memeriksa...";
            overall.className = "pill pending";
            overall.innerHTML = '<span class="dot"></span>Memeriksa';

            try {
                const response = await fetch("/api/health");
                const result = await response.json();
                const connected = response.ok && result.database === "connected";
                database.className = connected ? "value healthy" : "value";
                database.innerHTML = `<span class="service-dot"></span>${connected ? "Terhubung" : "Tidak tersedia"}`;
                overall.className = connected ? "pill" : "pill offline";
                overall.innerHTML = `<span class="dot"></span>${connected ? "Terhubung" : "Periksa database"}`;
            } catch {
                database.className = "value";
                database.innerHTML = '<span class="service-dot"></span>API tidak dapat dijangkau';
                overall.className = "pill offline";
                overall.innerHTML = '<span class="dot"></span>Tidak terhubung';
            } finally {
                checkedAt.textContent = `Pemeriksaan terakhir ${new Date().toLocaleTimeString("id-ID")}`;
                refresh.disabled = false;
                refresh.textContent = "Periksa ulang";
            }
        }

        refresh.addEventListener("click", checkHealth);
        checkHealth();
    </script>
</body>
</html>
