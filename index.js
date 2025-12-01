const express = require('express');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

const DB_FILE = path.join(__dirname, 'data.json');

// Helper to read/write "db"
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ transacoes: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Calcular saldo
function calcularSaldo(transacoes) {
  return transacoes.reduce((s, t) => s + (t.tipo === 'CREDITO' ? t.valor : -t.valor), 0);
}

// Endpoints
app.get('/saldo', (req, res) => {
  const db = readDB();
  const saldo = calcularSaldo(db.transacoes);
  res.json({ saldo });
});

app.get('/transacoes', (req, res) => {
  const db = readDB();
  res.json(db.transacoes.slice().sort((a,b) => new Date(b.data) - new Date(a.data)));
});

app.post('/depositar', (req, res) => {
  const { descricao, valor } = req.body;
  if (!valor || valor <= 0) return res.status(400).json({ error: 'Valor inválido' });

  const db = readDB();
  const transacao = {
    id: uuidv4(),
    descricao: descricao || 'Depósito',
    tipo: 'CREDITO',
    valor: Number(valor),
    data: new Date().toISOString()
  };
  db.transacoes.push(transacao);
  writeDB(db);
  res.status(201).json(transacao);
});

app.post('/sacar', (req, res) => {
  const { descricao, valor } = req.body;
  if (!valor || valor <= 0) return res.status(400).json({ error: 'Valor inválido' });

  const db = readDB();
  const saldoAtual = calcularSaldo(db.transacoes);
  if (valor > saldoAtual) return res.status(400).json({ error: 'Saldo insuficiente' });

  const transacao = {
    id: uuidv4(),
    descricao: descricao || 'Saque',
    tipo: 'DEBITO',
    valor: Number(valor),
    data: new Date().toISOString()
  };
  db.transacoes.push(transacao);
  writeDB(db);
  res.status(201).json(transacao);
});

// Rota de healthcheck
app.get('/', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`API rodando em http://localhost:${PORT}`));
