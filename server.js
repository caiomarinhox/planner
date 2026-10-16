// Configurações do servidor HTTP (usando o framework Express.js)
const express = require("express");

const PORT = 3000;

const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger-output.json");

// Banco de dados de tarefas. Nesta versão, as tarefas estão salvas em memória volátil.
function createDefaultTasks() {
  return new Map([
    [1, {
      id: 1,
      title: "Revisar o artigo ACM Survey",
      completed: false,
      date: "15/10/2026",
      completionDate: null
    }],
    [2, {
      id: 2,
      title: "Preparar material para o curso TDS",
      completed: true,
      date: "12/10/2026",
      completionDate: "10/10/2026"
    }],
    [3, {
      id: 3,
      title: "Preparar apresentação da palestra BBDW",
      completed: false,
      date: "15/10/2026",
      completionDate: null
    }]
  ]);
}

function isBeforeToday(dateString) {
  if (typeof dateString !== "string") {
    return false;
  }

  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateString);
  if (!match) {
    return false;
  }

  const [, day, month, year] = match;
  const dueDate = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    dueDate.getFullYear() !== Number(year) ||
    dueDate.getMonth() !== Number(month) - 1 ||
    dueDate.getDate() !== Number(day)
  ) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
}

function createApp(initialTasks = createDefaultTasks()) {
  const app = express();
  const tasks = new Map(initialTasks);

  app.use(express.json());
  app.set("json spaces", 2);
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  // GET /tasks - "endpoint" que recupera todas as tarefas.
  app.get("/tasks", (req, res) => {
    const allTasks = [];
    for (const task of tasks.values()) {
      allTasks.push(task);
    }
    res.json(allTasks);
  });

  // GET /tasks/overdue - retorna tarefas pendentes com data prevista anterior a hoje.
  app.get("/tasks/overdue", (req, res) => {
    const overdueTasks = [...tasks.values()].filter(
      (task) => !task.completed && isBeforeToday(task.date)
    );
    res.json(overdueTasks);
  });

  // GET /tasks/:id - "endpoint" que recupera uma tarefa específica pelo ID.
  app.get("/tasks/:id", (req, res) => {
    const id = Number(req.params.id);
    const task = tasks.get(id);

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json(task);
  });

  app.patch("/tasks/:id", (req, res) => {
    const id = Number(req.params.id);
    const task = tasks.get(id);

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const updatedTask = { ...task, title };
    tasks.set(id, updatedTask);
    res.json(updatedTask);
  });

  app.post("/tasks", (req, res) => {
    const { title, date } = req.body;

    if (!title || !date) {
      return res.status(400).json({ error: "Title and date are required" });
    }

    const newId = tasks.size + 1;  //TODO: Melhorar a geração de IDs para evitar colisões em um cenário real.
    const newTask = {
      id: newId,
      title,
      completed: false,
      date,
      completionDate: null
    };
    tasks.set(newId, newTask);
    res.status(201).json(newTask);
  });

  return app;
}

const app = createApp();

// Start the server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}


module.exports = app;
module.exports.createApp = createApp;