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
    password: 'tuclave',
    database: 'sakila'
  });
} else {
  db.init({
    host: '127.0.0.1',
    port: 3306,
    user: 'super',
    password: '1234',
    database: 'sakila'
  });
}

// Static files
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

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

hbs.registerHelper('eq', (a, b) => a == b);
hbs.registerHelper('gt', (a, b) => a > b);

hbs.registerPartials(path.join(__dirname, 'views', 'partials'));

function getCommonData() {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, 'data', 'common.json'), 'utf8')
  );
}

// Ruta /
app.get('/', async (req, res) => {
  try {
    const moviesRows = await db.query(`
      SELECT
        f.film_id,
        f.title,
        f.release_year,
        COALESCE(
          GROUP_CONCAT(
            DISTINCT CONCAT(a.first_name, ' ', a.last_name)
            ORDER BY a.first_name, a.last_name SEPARATOR ', '
          ),
          '—'
        ) AS actors
      FROM film f
      LEFT JOIN film_actor fa ON fa.film_id = f.film_id
      LEFT JOIN actor a ON a.actor_id = fa.actor_id
      GROUP BY f.film_id, f.title, f.release_year
      ORDER BY f.film_id
      LIMIT 5
    `);

    const categoriesRows = await db.query(`
      SELECT category_id, name
      FROM category
      ORDER BY category_id
      LIMIT 5
    `);

    const moviesJson = db.table_to_json(moviesRows, {
      film_id: 'number',
      title: 'string',
      release_year: 'number',
      actors: 'string'
    });

    const categoriesJson = db.table_to_json(categoriesRows, {
      category_id: 'number',
      name: 'string'
    });

    res.render('index', {
      movies: moviesJson,
      categories: categoriesJson,
      common: getCommonData()
    });
  } catch (err) {
    console.error('ERROR /:', err);
    res.status(500).send('Error consultant la base de dades');
  }
});

// Ruta /movies
app.get('/movies', async (req, res) => {
  try {
    const moviesRows = await db.query(`
      SELECT
        f.film_id,
        f.title,
        f.release_year,
        f.description,
        COALESCE(
          GROUP_CONCAT(
            DISTINCT CONCAT(a.first_name, ' ', a.last_name)
            ORDER BY a.first_name, a.last_name SEPARATOR ', '
          ),
          '—'
        ) AS actors
      FROM film f
      LEFT JOIN film_actor fa ON fa.film_id = f.film_id
      LEFT JOIN actor a ON a.actor_id = fa.actor_id
      GROUP BY f.film_id, f.title, f.release_year, f.description
      ORDER BY f.film_id
      LIMIT 15
    `);

    const moviesJson = db.table_to_json(moviesRows, {
      film_id: 'number',
      title: 'string',
      release_year: 'number',
      description: 'string',
      actors: 'string'
    });

    res.render('movies', {
      movies: moviesJson,
      common: getCommonData()
    });
  } catch (err) {
    console.error('ERROR /movies:', err);
    res.status(500).send('Error consultant la base de dades');
  }
});

// Ruta /customers
app.get('/customers', async (req, res) => {
  try {
    const customersRows = await db.query(`
      SELECT
        customer_id,
        first_name,
        last_name,
        email
      FROM customer
      ORDER BY customer_id
      LIMIT 25
    `);

    const customersJson = db.table_to_json(customersRows, {
      customer_id: 'number',
      first_name: 'string',
      last_name: 'string',
      email: 'string'
    });

    for (const customer of customersJson) {
      const rentalsRows = await db.query(`
        SELECT
          r.rental_id,
          r.rental_date,
          f.title
        FROM rental r
        JOIN inventory i ON i.inventory_id = r.inventory_id
        JOIN film f ON f.film_id = i.film_id
        WHERE r.customer_id = ?
        ORDER BY r.rental_date
        LIMIT 5
      `, [customer.customer_id]);

      customer.rentals = db.table_to_json(rentalsRows, {
        rental_id: 'number',
        rental_date: 'string',
        title: 'string'
      });
    }

    res.render('customers', {
      customers: customersJson,
      common: getCommonData()
    });
  } catch (err) {
    console.error('ERROR /customers:', err);
    res.status(500).send('Error consultant la base de dades');
  }
});


// Start server
const httpServer = app.listen(port, () => {
  console.log(`http://localhost:${port}`);
  console.log(`http://localhost:${port}/movies`);
  console.log(`http://localhost:${port}/customers`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await db.end();
  httpServer.close();
  process.exit(0);
});

// Para arrancar el servidor: npm run dev