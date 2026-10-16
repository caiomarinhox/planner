const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const appFactory = require("../server");
const createApp = appFactory.createApp;

function createTestApp(initialTasks = []) {
  return createApp(initialTasks);
}

function dateFromToday(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

async function createTask(app, date = dateFromToday(1)) {
  const response = await request(app)
    .post("/tasks")
    .send({ title: "Tarefa de teste", date });

  assert.equal(response.status, 201);
  return response.body;
}

test("GET /tasks returns all tasks", async () => {
  const app = createTestApp();
  const task = await createTask(app);
  const response = await request(app).get("/tasks");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, [task]);
});

test("GET /tasks/:id returns a specific task", async () => {
  const app = createTestApp();
  const task = await createTask(app);
  const response = await request(app).get(`/tasks/${task.id}`);

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, task);
});

test("GET /tasks/:id returns 404 for non-existent task", async () => {
  const app = createTestApp();
  const response = await request(app).get("/tasks/999");

  assert.equal(response.status, 404);
  assert.deepEqual(response.body, { error: "Task not found" });
});

test("POST /tasks creates a new task", async () => {
  const app = createTestApp();
  const newTask = {
    title: "Elaborar os projetos de desenvolvimento da turma.",
    date: dateFromToday(1)
  };

  const response = await request(app).post("/tasks").send(newTask);

  assert.equal(response.status, 201);
  assert.equal(response.body.title, newTask.title);
  assert.equal(response.body.completed, false);
  assert.equal(response.body.date, newTask.date);
  assert.equal(response.body.completionDate, null);
});

test("PATCH /tasks/:id updates a task title", async () => {
  const app = createTestApp();
  const task = await createTask(app);
  const response = await request(app)
    .patch(`/tasks/${task.id}`)
    .send({ title: "Revisar o artigo atualizado" });

  assert.equal(response.status, 200);
  assert.equal(response.body.id, task.id);
  assert.equal(response.body.title, "Revisar o artigo atualizado");
  assert.equal(response.body.completed, false);
  assert.equal(response.body.date, task.date);
  assert.equal(response.body.completionDate, null);
});

test("PATCH /tasks/:id returns 400 when title is missing", async () => {
  const app = createTestApp();
  const task = await createTask(app);
  const response = await request(app).patch(`/tasks/${task.id}`).send({});

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, { error: "Title is required" });
});

test("PATCH /tasks/:id returns 404 for non-existent task", async () => {
  const app = createTestApp();
  const response = await request(app)
    .patch("/tasks/999")
    .send({ title: "Título atualizado" });

  assert.equal(response.status, 404);
  assert.deepEqual(response.body, { error: "Task not found" });
});

test("GET /tasks/overdue returns an empty list when there are no overdue tasks", async () => {
  const app = createTestApp();
  const response = await request(app).get("/tasks/overdue");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, []);
});

test("GET /tasks/overdue returns only pending tasks dated before today", async () => {
  const app = createTestApp();
  const overdueTask = await createTask(app, dateFromToday(-1));
  await createTask(app, dateFromToday(0));
  await createTask(app, dateFromToday(1));

  const response = await request(app).get("/tasks/overdue");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, [overdueTask]);
});

test("GET /tasks/overdue excludes completed overdue tasks", async () => {
  const completedTask = {
    id: 1,
    title: "Tarefa concluída",
    completed: true,
    date: dateFromToday(-1),
    completionDate: dateFromToday(0)
  };
  const app = createTestApp([[completedTask.id, completedTask]]);

  const response = await request(app).get("/tasks/overdue");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, []);
});