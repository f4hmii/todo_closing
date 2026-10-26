import http from "node:http";
import { createPool } from "mysql2/promise";

const port = Number(process.env.PORT || 3001);
const pool = createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "closing_todo",
  connectionLimit: 10
});

const json = (response, status, body) => {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  response.end(JSON.stringify(body));
};

const readBody = request => new Promise((resolve, reject) => {
  let body = "";
  request.on("data", chunk => { body += chunk; });
  request.on("end", () => {
    try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error("JSON request tidak valid.")); }
  });
  request.on("error", reject);
});

const normalizeTime = value => {
  if (typeof value !== "string") return null;
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  return match ? `${match[1]}:${match[2]}:${match[3] || "00"}` : null;
};

async function bootstrap() {
  const [staff] = await pool.query("SELECT id, name FROM staff ORDER BY name");
  const [categories] = await pool.query("SELECT id, name, icon, active FROM categories ORDER BY created_at, name");
  const [tasks] = await pool.query("SELECT id, text, category_id AS categoryId, active FROM tasks ORDER BY created_at, id");
  const [reports] = await pool.query("SELECT id, DATE_FORMAT(closing_date, '%Y-%m-%d') AS date, staff_id AS staffId, staff_name AS staffName, TIME_FORMAT(submit_time, '%H:%i') AS submitTime FROM closing_reports ORDER BY closing_date DESC, submit_time DESC");
  const [reportTasks] = await pool.query("SELECT report_id AS reportId, task_id AS taskId, task_text AS taskText FROM closing_report_tasks");
  const [reportPhotos] = await pool.query("SELECT report_id AS reportId, image_url AS imageUrl, view_url AS viewUrl, local_url AS localUrl, TIME_FORMAT(photo_time, '%H:%i') AS time, uploaded FROM closing_report_photos ORDER BY id");
  const tasksByReport = new Map();
  for (const task of reportTasks) {
    const current = tasksByReport.get(task.reportId) || { ids: [], names: [] };
    current.ids.push(task.taskId);
    current.names.push(task.taskText);
    tasksByReport.set(task.reportId, current);
  }
  const photosByReport = new Map();
  for (const photo of reportPhotos) {
    const current = photosByReport.get(photo.reportId) || [];
    current.push({ imageUrl: photo.imageUrl || undefined, viewUrl: photo.viewUrl || undefined, localUrl: photo.localUrl || "", time: photo.time, uploaded: Boolean(photo.uploaded) });
    photosByReport.set(photo.reportId, current);
  }
  return {
    staff,
    categories: categories.map(category => ({ ...category, active: Boolean(category.active) })),
    tasks: tasks.map(task => ({ ...task, active: Boolean(task.active) })),
    reports: reports.map(report => {
      const reportTaskData = tasksByReport.get(report.id) || { ids: [], names: [] };
      return { ...report, completedTaskIds: reportTaskData.ids, completedTaskNames: reportTaskData.names, photos: photosByReport.get(report.id) || [] };
    })
  };
}

const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") return json(response, 204, {});
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  try {
    if (request.method === "GET" && url.pathname === "/api/bootstrap") return json(response, 200, await bootstrap());
    if (request.method === "POST" && url.pathname === "/api/staff") {
      const body = await readBody(request);
      if (typeof body.id !== "string" || typeof body.name !== "string" || !body.name.trim()) return json(response, 400, { error: "Data PIC tidak valid." });
      await pool.query("INSERT INTO staff (id, name) VALUES (?, ?)", [body.id, body.name.trim()]);
      return json(response, 201, { success: true });
    }
    if (request.method === "POST" && url.pathname === "/api/reports") {
      const body = await readBody(request);
      const submitTime = normalizeTime(body.submitTime);
      if (!body.id || !body.date || !body.staffId || !body.staffName || !submitTime || !Array.isArray(body.completedTaskIds) || !Array.isArray(body.photos)) {
        return json(response, 400, { error: "Data laporan closing tidak lengkap." });
      }
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await connection.query(
          "INSERT INTO closing_reports (id, closing_date, staff_id, staff_name, submit_time) VALUES (?, ?, ?, ?, ?)",
          [body.id, body.date, body.staffId, body.staffName, submitTime]
        );
        const taskNames = Array.isArray(body.completedTaskNames) ? body.completedTaskNames : [];
        for (let index = 0; index < body.completedTaskIds.length; index += 1) {
          await connection.query(
            "INSERT INTO closing_report_tasks (report_id, task_id, task_text) VALUES (?, ?, ?)",
            [body.id, body.completedTaskIds[index], taskNames[index] || body.completedTaskIds[index]]
          );
        }
        for (const photo of body.photos) {
          await connection.query(
            "INSERT INTO closing_report_photos (report_id, image_url, view_url, local_url, photo_time, uploaded) VALUES (?, ?, ?, ?, ?, ?)",
            [body.id, photo.imageUrl || null, photo.viewUrl || null, photo.localUrl || null, normalizeTime(photo.time) || submitTime, photo.uploaded ? 1 : 0]
          );
        }
        await connection.commit();
        return json(response, 201, { success: true });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }
    if (request.method === "POST" && url.pathname === "/api/categories") {
      const body = await readBody(request);
      if (typeof body.id !== "string" || typeof body.name !== "string" || !body.name.trim()) return json(response, 400, { error: "Data area tidak valid." });
      await pool.query("INSERT INTO categories (id, name, icon, active) VALUES (?, ?, ?, ?)", [body.id, body.name.trim(), body.icon || "Store", body.active === false ? 0 : 1]);
      return json(response, 201, { success: true });
    }
    const categoryMatch = url.pathname.match(/^\/api\/categories\/([^/]+)$/);
    if (request.method === "PUT" && categoryMatch) {
      const body = await readBody(request);
      if (typeof body.active !== "boolean") return json(response, 400, { error: "active wajib berupa boolean." });
      const [result] = await pool.query("UPDATE categories SET active = ? WHERE id = ?", [body.active ? 1 : 0, categoryMatch[1]]);
      if (!result.affectedRows) return json(response, 404, { error: "Area tidak ditemukan." });
      return json(response, 200, { success: true });
    }
    const taskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
    if (request.method === "PUT" && taskMatch) {
      const body = await readBody(request);
      if (typeof body.active !== "boolean") return json(response, 400, { error: "active wajib berupa boolean." });
      const [result] = await pool.query("UPDATE tasks SET active = ? WHERE id = ?", [body.active ? 1 : 0, taskMatch[1]]);
      if (!result.affectedRows) return json(response, 404, { error: "Checklist tidak ditemukan." });
      return json(response, 200, { success: true });
    }
    return json(response, 404, { error: "Endpoint tidak ditemukan." });
  } catch (error) {
    console.error(error);
    return json(response, 500, { error: "Server gagal memproses permintaan." });
  }
});

server.listen(port, () => console.log(`Closing backend berjalan di http://localhost:${port}`));
