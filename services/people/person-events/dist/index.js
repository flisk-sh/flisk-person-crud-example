import amqp from "amqplib";
// Consumes the person-events queue that person-api publishes to on every create, update and delete.
const RABBITMQ_URL = process.env.RABBITMQ_URL ?? "amqp://people:people@rabbitmq:4620";
const EVENTS_QUEUE = "person-events";
const RETRY_MS = 2000;
console.log("🚀 person-events worker started");
async function consume() {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(EVENTS_QUEUE, { durable: true });
    await channel.prefetch(10);
    console.log(`[Worker] connected, consuming ${EVENTS_QUEUE}`);
    connection.on("close", () => {
        console.warn("[Worker] connection closed, reconnecting");
        void start();
    });
    await channel.consume(EVENTS_QUEUE, (message) => {
        if (!message)
            return;
        try {
            const event = JSON.parse(message.content.toString());
            // Replace this log with real work: send a welcome email, update a search index, ...
            console.log(`[Worker] ${event.type} ${event.person.name} <${event.person.email}> (${event.person._id})`);
            channel.ack(message);
        }
        catch (error) {
            console.error("[Worker] dropping unreadable message:", error);
            channel.nack(message, false, false);
        }
    });
}
// RabbitMQ may still be starting when the worker comes up, so retry until it answers.
async function start() {
    for (let attempt = 1;; attempt++) {
        try {
            await consume();
            return;
        }
        catch (error) {
            console.warn(`[Worker] rabbitmq not ready (attempt ${attempt}): ${error.message}`);
            await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
        }
    }
}
process.on("SIGTERM", () => {
    console.log("[Worker] SIGTERM received, shutting down gracefully...");
    process.exit(0);
});
process.on("SIGINT", () => {
    console.log("[Worker] SIGINT received, shutting down gracefully...");
    process.exit(0);
});
void start();
//# sourceMappingURL=index.js.map