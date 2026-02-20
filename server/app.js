const express = require("express");
const hbs = require("express-handlebars");
const mysql = require("mysql2/promise");
const path = require("path");
const common = require("./data/common.json");

const app = express();
const PORT = 3000;

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
    host: "127.0.0.1",
    user: "root",
    password: "12345", //O la otra que es tuclave
    database: "sakila"
});

// RUTA PRINCIPAL
// RUTA PRINCIPAL (INDEX)
app.get("/", async (req, res) => {
    try {
        // Obtener películas
        const [movies] = await db.query(`
            SELECT film_id, title, release_year
            FROM film
            LIMIT 5
        `);

        // Obtener categorías
        const [categories] = await db.query(`
            SELECT category_id, name
            FROM category
            LIMIT 5
        `);

        // Renderizar la vista con los datos
        res.render("index", {
            common,
            movies,
            categories
        });

    } catch (err) {
        console.error("Error en la ruta /:", err);
        res.status(500).send("Error obteniendo datos");
    }
});

// RUTA MOVIES
app.get("/movies", async (req, res) => {
    const [rows] = await db.query(`
        SELECT film_id, title, release_year
        FROM film
        LIMIT 15
    `);

    for (let movie of rows) {
        const [actors] = await db.query(`
            SELECT actor.first_name, actor.last_name
            FROM actor
            JOIN film_actor USING(actor_id)
            WHERE film_id = ?
        `, [movie.film_id]);

        movie.actors = actors;
    }

    res.render("movies", { common, movies: rows });
});

// RUTA CUSTOMERS
app.get("/customers", async (req, res) => {
    const [customers] = await db.query(`
        SELECT customer_id, first_name, last_name, email
        FROM customer
        LIMIT 25
    `);

    for (let c of customers) {
        const [rentals] = await db.query(`
            SELECT rental_date
            FROM rental
            WHERE customer_id = ?
            LIMIT 5
        `, [c.customer_id]);

        c.rentals = rentals;
    }

    res.render("customers", { common, customers });
});

// INFORME
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
app.listen(PORT, () => {
    console.log(`Servidor en http://localhost:${PORT}`);
});

// npm run dev