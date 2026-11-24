import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import express, { type Express } from "express";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("amqplib", () => ({
	default: {
		connect: async () => ({
			createChannel: async () => ({ assertQueue: async () => {} }),
			on: () => {},
		}),
	},
}));

vi.mock("ioredis", () => ({
	Redis: class {
		on() {}
	},
}));

vi.mock("mongodb", async (importOriginal) => ({
	...(await importOriginal<typeof import("mongodb")>()),
	MongoClient: class {
		db() {
			return { collection: () => ({}) };
		}
		async connect() {}
	},
}));

let server: Server;
let baseUrl: string;

beforeAll(async () => {
	const listen = vi
		.spyOn(express.application, "listen")
		.mockImplementation(function (this: Express) {
			server = createServer(this);
			return server;
		});
	try {
		await import("../src/index");
	} finally {
		listen.mockRestore();
	}
	await new Promise<void>((resolve, reject) => {
		server.once("error", reject).listen(0, "127.0.0.1", resolve);
	});
	baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
	if (server?.listening) {
		await new Promise<void>((resolve, reject) => {
			server.close((error) => (error ? reject(error) : resolve()));
		});
	}
});

function putBody(body: object): RequestInit {
	return {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	};
}

describe("person item route IDs", () => {
	it.each(["GET", "PUT", "DELETE"])(
		"%s rejects a malformed ID",
		async (method) => {
			const response = await fetch(
				`${baseUrl}/persons/not-an-id`,
				method === "PUT"
					? putBody({ name: "Ada", email: "ada@example.com" })
					: { method },
			);
			expect(response.status).toBe(404);
			expect(await response.json()).toEqual({ error: "person not found" });
		},
	);

	it("PUT rejects a malformed ID before validating the body", async () => {
		const response = await fetch(`${baseUrl}/persons/not-an-id`, putBody({}));
		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "person not found" });
	});

	it("PUT still validates the body when the ID is valid", async () => {
		const response = await fetch(
			`${baseUrl}/persons/507f1f77bcf86cd799439011`,
			putBody({}),
		);
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "name is required" });
	});
});
