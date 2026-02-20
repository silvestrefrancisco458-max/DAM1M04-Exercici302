<<<<<<< HEAD
const express = require("express");
const hbs = require("express-handlebars");
const mysql = require("mysql2/promise");
const path = require("path");
const common = require("./data/common.json");

// Crear servidor
const app = express();

// PUBLIC
app.use(express.static(path.join(__dirname, "..", "public")));

// HBS
app.engine("hbs", hbs.engine({
    extname: "hbs",
    defaultLayout: false,
    partialsDir: path.join(__dirname, "views", "partials")
}));
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

// MYSQL
const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "root",
    database: "sakila"
});

// RUTA PRINCIPAL
app.get("/", async (req, res) => {
    const [movies] = await db.query(`
        SELECT film_id, title, release_year
        FROM film
        LIMIT 5
    `);

    const [categories] = await db.query(`
        SELECT category_id, name
        FROM category
        LIMIT 5
    `);

    res.render("index", { common, movies, categories });
});

// RUTA INFORME
app.get("/informe", async (req, res) => {
    const [customers] = await db.query(`
        SELECT customer_id, first_name, last_name, email
        FROM customer
        LIMIT 10
    `);

    for (let c of customers) {
        const [rentals] = await db.query(`
            SELECT rental_date
            FROM rental
            WHERE customer_id = ?
            LIMIT 3
        `, [c.customer_id]);

        c.rentals = rentals;
    }

    res.render("informe", { common, customers });
});

// INICIAR SERVIDOR
app.listen(3000, () => {
    console.log("Servidor en http://localhost:3000");
=======
const express = require('express');
const fs = require('fs');
const path = require('path');
const hbs = require('hbs');
const MySQL = require('./utilsMySQL');

const app = express();
const port = 3000;

// Detectar si estem al Proxmox (si és pm2)
const isProxmox = !!process.env.PM2_HOME;

// Iniciar connexió MySQL
const db = new MySQL();
if (!isProxmox) {
  db.init({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'root',
    database: 'sakila'
  });
} else {
  db.init({
    host: '127.0.0.1',
    port: 3306,
    user: 'super',
    password: '1234',
    database: 'escola'
  });
}

// Static files - ONLY ONCE
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))

// Disable cache
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Handlebars
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// Registrar "Helpers .hbs" aquí
hbs.registerHelper('eq', (a, b) => a == b);
hbs.registerHelper('gt', (a, b) => a > b);

// Partials de Handlebars
hbs.registerPartials(path.join(__dirname, 'views', 'partials'));

// Route
app.get('/', async (req, res) => {
  try {
    // Obtenir les dades de la base de dades
    const cursosRows = await db.query('SELECT id, nom, tematica FROM cursos ORDER BY id');
    const especialitatsRows = await db.query('SELECT id, nom FROM especialitats ORDER BY nom');

    // Transformar les dades a JSON (per les plantilles .hbs)
    // Cal informar de les columnes i els seus tipus
    const cursosJson = db.table_to_json(cursosRows, { id: 'number', nom: 'string', tematica: 'string' });
    const especialitatsJson = db.table_to_json(especialitatsRows, { id: 'number', nom: 'string' });

    // Llegir l'arxiu .json amb dades comunes per a totes les pàgines
    const commonData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'data', 'common.json'), 'utf8')
    );

    // Construir l'objecte de dades per a la plantilla
    const data = {
      cursos: cursosJson,
      especialitats: especialitatsJson,
      common: commonData
    };

    // Renderitzar la plantilla amb les dades
    res.render('index', data);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error consultant la base de dades');
  }
});

app.get('/cursos', async (req, res) => {
  try {

    // Obtenir les dades de la base de dades
    const cursosRows = await db.query(`
      SELECT
        c.id,
        c.nom,
        c.tematica,
        COALESCE(
          GROUP_CONCAT(DISTINCT m.nom ORDER BY m.nom SEPARATOR ', '),
          '—'
        ) AS mestre_nom
      FROM cursos c
      LEFT JOIN mestre_curs mc ON mc.curs_id = c.id
      LEFT JOIN mestres m ON m.id = mc.mestre_id
      GROUP BY c.id, c.nom, c.tematica
      ORDER BY c.id;
    `);

    // Transformar les dades a JSON (per les plantilles .hbs)
    const cursosJson = db.table_to_json(cursosRows, {
      id: 'number',
      nom: 'string',
      tematica: 'string',
      mestre_nom: 'string'
    });

    // Llegir l'arxiu .json amb dades comunes per a totes les pàgines
    const commonData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'data', 'common.json'), 'utf8')
    );

    // Construir l'objecte de dades per a la plantilla
    const data = {
      cursos: cursosJson,
      common: commonData
    };

    // Renderitzar la plantilla amb les dades
    res.render('cursos', data);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error consultant la base de dades');
  }
});

// Start server
const httpServer = app.listen(port, () => {
  console.log(`http://localhost:${port}`);
  console.log(`http://localhost:${port}/cursos`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await db.end();
  httpServer.close();
  process.exit(0);
>>>>>>> 9bbfedf7c6c7844d7f5b42e5cc89b8eebf78f656
});