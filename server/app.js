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
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'tuclave',
    database: 'sakila'
  });
} else {
  db.init({
    host: 'localhost',
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
    const moviesRows = await db.query(`
      SELECT
        f.film_id,
        f.title,
        f.release_year,
        GROUP_CONCAT(
          DISTINCT CONCAT(a.first_name, ' ', a.last_name)
          ORDER BY a.last_name, a.first_name
          SEPARATOR ', '
        ) AS actors
      FROM film f
      LEFT JOIN film_actor fa ON fa.film_id = f.film_id
      LEFT JOIN actor a ON a.actor_id = fa.actor_id
      GROUP BY f.film_id, f.title, f.release_year
      ORDER BY f.film_id
      LIMIT 5;
    `);

    const categoriesRows = await db.query(`
      SELECT
        category_id,
        name
      FROM category
      ORDER BY category_id
      LIMIT 5;
    `);

    const movies = db.table_to_json(moviesRows, {
      film_id: 'number',
      title: 'string',
      release_year: 'number',
      actors: 'string'
    });

    const categories = db.table_to_json(categoriesRows, {
      category_id: 'number',
      name: 'string'
    });

    res.render('index', {
      movies,
      categories,
      common: loadCommonData()
    });
  } catch (err) {
    console.error(err);
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
        f.description,
        f.release_year,
        f.length,
        f.rating,
        GROUP_CONCAT(
          DISTINCT CONCAT(a.first_name, ' ', a.last_name)
          ORDER BY a.last_name, a.first_name
          SEPARATOR ', '
        ) AS actors
      FROM film f
      LEFT JOIN film_actor fa ON fa.film_id = f.film_id
      LEFT JOIN actor a ON a.actor_id = fa.actor_id
      GROUP BY
        f.film_id,
        f.title,
        f.description,
        f.release_year,
        f.length,
        f.rating
      ORDER BY f.film_id
      LIMIT 15;
    `);

    const movies = db.table_to_json(moviesRows, {
      film_id: 'number',
      title: 'string',
      description: 'string',
      release_year: 'number',
      length: 'number',
      rating: 'string',
      actors: 'string'
    });

    res.render('movies', {
      movies,
      common: loadCommonData()
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error consultant la base de dades');
  }
});

// Ruta /customers
app.get('/customers', async (req, res) => {
  try {
    const customersRows = await db.query(`
      SELECT
        c.customer_id,
        c.first_name,
        c.last_name,
        c.email
      FROM customer c
      ORDER BY c.customer_id
      LIMIT 25;
    `);

    const rentalsRows = await db.query(`
      SELECT
        c.customer_id,
        r.rental_id,
        f.title,
        r.rental_date
      FROM customer c
      JOIN rental r ON r.customer_id = c.customer_id
      JOIN inventory i ON i.inventory_id = r.inventory_id
      JOIN film f ON f.film_id = i.film_id
      WHERE c.customer_id IN (
        SELECT customer_id
        FROM customer
        ORDER BY customer_id
        LIMIT 25
      )
      ORDER BY c.customer_id, r.rental_date
    `);

    const customers = db.table_to_json(customersRows, {
      customer_id: 'number',
      first_name: 'string',
      last_name: 'string',
      email: 'string'
    });

    const rentals = db.table_to_json(rentalsRows, {
      customer_id: 'number',
      rental_id: 'number',
      title: 'string',
      rental_date: 'string'
    });

    for (const customer of customers) {
      customer.rentals = rentals
        .filter(r => r.customer_id === customer.customer_id)
        .slice(0, 5);
    }

    res.render('customers', {
      customers,
      common: loadCommonData()
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error consultant la base de dades');
  }
});


// Start server
const httpServer = app.listen(port, '0.0.0.0', () => {
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