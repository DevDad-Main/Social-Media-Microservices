import amqp from "amqplib";
import { AppError, logger } from "devdad-express-utils";

const EXCHANGE_NAME = "SocialMediaMicroservice_events";

let connection = null;
let channel = null;

async function connectionToRabbitMQ() {
  try {
    if (connection) {
      return;
    }

    return (connection = await amqp.connect(process.env.RABBITMQ_URL));
  } catch (error) {
    logger.error("Error connecting to RabbitMQ: ", error);
  }
}

export async function initializeRabbitMQ() {
  try {
    const connect = await connectionToRabbitMQ();
    if (!connect) {
      throw new AppError("Failed to connect to RabbitMQ");
    }

    channel = await connect.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: false });
    logger.info("Connected to RabbitMQ");

    return channel;
  } catch (error) {
    logger.error("Error connecting to RabbitMQ: ", error);
  }
}

export async function consumeEvent(routingKey, callback) {
  if (!channel) {
    await initializeRabbitMQ();
  }

  const queue = await channel.assertQueue("", { exclusive: true });
  await channel.bindQueue(queue.queue, EXCHANGE_NAME, routingKey);
  channel.consume(queue.queue, (msg) => {
    if (!msg || msg === null) {
      return new AppError("Message is null");
    }
    const content = JSON.parse(msg.content.toString());
    callback(content);
    channel.ack(msg);

    logger.info(`Consumed event from ${routingKey}:${content}`);
  });
}
