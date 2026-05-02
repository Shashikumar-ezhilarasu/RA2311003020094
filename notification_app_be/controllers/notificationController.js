const model = require('../models/notificationModel');
const priority = require('../services/priorityInbox');
const { Log } = require('../../logging_middleware');

let clients = [];

exports.getAll = async (req, res) => {
    try {
        let studentId = "0094"; 
        let page = req.query.page;
        let limit = req.query.limit;
        let type = req.query.type;
        let isRead = req.query.isRead;

        let data = await model.getAll(studentId, page, limit, type, isRead);

        await Log('backend', 'info', 'route', 'get all notifs');

        res.json({ status: 'success', data: data });
    } catch (err) {
        await Log('backend', 'error', 'route', err.message);
        res.status(500).json({ error: err.message });
    }
};

exports.getPriorityInbox = async (req, res) => {
    try {
        let studentId = "1042";
        let limit = req.query.limit || 10;

        let data = await model.getAll(studentId, 1, 100, null, 'false');
        let top = priority.getTop(data.notifications, limit);

        await Log('backend', 'info', 'route', 'priority inbox called');

        res.json({ status: 'success', data: { notifications: top } });
    } catch (err) {
        await Log('backend', 'error', 'route', err.message);
        res.status(500).json({ error: err.message });
    }
};

exports.markRead = async (req, res) => {
    try {
        let id = req.params.id;
        let notif = await model.markRead(id);

        if (!notif) {
            await Log('backend','warn','route','notif not found');
            return res.status(404).json({ error: 'not found' });
        }

        await Log('backend','info','route','notif marked read');

        res.json({ status:'success', data: notif });
    } catch (err) {
        await Log('backend', 'error', 'route', err.message);
        res.status(500).json({ error: err.message });
    }
};

exports.deleteNotif = async (req, res) => {
    try {
        let id = req.params.id;
        let done = await model.deleteOne(id);

        if (!done) {
            await Log('backend', 'warn', 'route', 'notif missing for delete');
            return res.status(404).json({ error: 'not found' });
        }

        await Log('backend', 'info', 'route', 'notif deleted');

        res.status(204).send();
    } catch (err) {
        await Log('backend', 'error', 'route', err.message);
        res.status(500).json({ error: err.message });
    }
};

exports.getUnreadCount = async (req, res) => {
    try {
        let count = await model.unreadCount("1042");
        await Log('backend', 'info', 'route', 'unread count fetched');
        res.json({ status: 'success', data: { unreadCount: count } });
    } catch (err) {
        await Log('backend', 'error', 'route', err.message);
        res.status(500).json({ error: err.message });
    }
};

exports.stream = (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let client = { id: Date.now(), studentId: "1042", res: res };
    clients.push(client);

    req.on('close', () => {
        let newClients = [];
        for (let i = 0; i < clients.length; i++) {
            if (clients[i].id !== client.id) {
                newClients.push(clients[i]);
            }
        }
        clients = newClients;
    });
};

exports.createNotif = async (req, res) => {
    try {
        let sId = req.body.studentId;
        let t = req.body.type;
        let title = req.body.title;
        let msg = req.body.message;
        
        let notif = await model.create({ studentId: sId, type: t, title: title, message: msg });

        for (let i = 0; i < clients.length; i++) {
            if (clients[i].studentId === sId) {
                clients[i].res.write("data: " + JSON.stringify(notif) + "\n\n");
            }
        }

        await Log('backend', 'info', 'route', 'created notif');

        res.status(201).json({ status: 'success', data: notif });
    } catch (err) {
        await Log('backend', 'error', 'route', err.message);
        res.status(500).json({ error: err.message });
    }
};
