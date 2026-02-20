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
});