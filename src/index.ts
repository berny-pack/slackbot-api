import "dotenv/config";
import express from "express";
import { App, LogLevel } from "@slack/bolt";
import cors from "cors";
import bodyParser from "body-parser";
import multer from "multer";

const upload = multer({
	storage: multer.memoryStorage(),
});

const server = express();

// Check for env variables
if (!process.env.SLACK_BOT_TOKEN) {
	console.error("SLACK_BOT_TOKEN is required to run this app");
	process.exit(1);
}

if (!process.env.SLACK_SIGNING_SECRET) {
	console.error("SLACK_SIGNING_SECRET is required to run this app");
	process.exit(1);
}

if (!process.env.CHANNEL_NAME) {
	console.error("CHANNEL_NAME is required to run this app");
	process.exit(1);
}

// for cors
server.use(cors());
// for parsing application/json
server.use(bodyParser.json());
// for parsing application/xwww-
server.use(bodyParser.urlencoded({ extended: true }));

server.get("/", (req, res) => {
	res.send("Hello World!");
});

server.listen(process.env.PORT ?? 3000, () => {
	console.log(`Server started on port ${process.env.PORT ?? 3000}`);
});

const app = new App({
	token: process.env.SLACK_BOT_TOKEN,
	signingSecret: process.env.SLACK_SIGNING_SECRET,
	logLevel:
		process.env.NODE_ENV === "production" ? LogLevel.ERROR : LogLevel.DEBUG,
});

// Find conversation ID using the conversations.list method
async function findConversation(name: string) {
	try {
		// Call the conversations.list method using the built-in WebClient
		const result = await app.client.conversations.list({
			// The token you used to initialize your app
			token: process.env.SLACK_BOT_TOKEN,
		});

		if (result.channels) {
			for (const channel of result.channels) {
				if (channel.name === name) {
					return channel.id;
				}
			}
		}
	} catch (error) {
		console.error(error);
	}
}

async function publishMessage(id: string, text: string) {
	try {
		// Call the chat.postMessage method using the built-in WebClient
		const result = await app.client.chat.postMessage({
			// The token you used to initialize your app
			token: process.env.SLACK_BOT_TOKEN,
			channel: id,
			text: text,
			// You could also use a blocks[] array to send richer content
		});

		console.log(result);
	} catch (error) {
		console.error(error);
	}
}

async function uploadFile(id: string, file: Express.Multer.File) {
	try {
		// Call the files.upload method using the built-in WebClient
		const result = await app.client.files.uploadV2({
			// The token you used to initialize your app
			token: process.env.SLACK_BOT_TOKEN,
			channels: id,
			file: file.buffer,
			filename: file.originalname,
			initial_comment: `QR codes générés : ${file.originalname}`,
			title: file.originalname,
		});

		return result;
	} catch (error) {
		console.error(error);
	}
}

// This endpoint will receive formdata containing a csv file (file element of a formdata)
server.post("/slack/qr_codes_csv", upload.single("file"), async (req, res) => {
	const { file } = req;

	if (file && process.env.CHANNEL_NAME) {
		const conversationId = await findConversation(process.env.CHANNEL_NAME);

		if (conversationId) {
			const result = await uploadFile(conversationId, file);

			if (result) {
				res.send("File uploaded successfully");
			} else {
				console.error("Error uploading file");
				res.status(500).send("Error uploading file");
			}
		} else {
			console.error("Could not find conversation");
			res.status(500).send("Could not find conversation");
		}
	} else {
		console.error("No file provided");
		res.status(400).send("No file provided");
	}
});
