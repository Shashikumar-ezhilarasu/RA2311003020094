const { v4: uuidv4 } = require('uuid');
const { Log } = require('../../logging_middleware');

let tasks = [];

exports.getAll = async (req, res) => {
    try {
        await Log('backend', 'info', 'route', 'get all tasks');
        res.json({ status: 'success', data: tasks });
    } catch (err) {
        await Log('backend', 'error', 'route', err.message);
        res.status(500).json({ error: err.message });
    }
};

exports.scheduleMaintenance = async (req, res) => {
    try {
        let vId = req.body.vehicleId;
        let desc = req.body.taskDescription;
        let date = req.body.scheduledDate;

        let obj = {
            id: uuidv4(),
            vehicleId: vId,
            taskDescription: desc,
            scheduledDate: date,
            status: 'PENDING',
            createdAt: new Date().toISOString()
        };

        tasks.push(obj);

        await Log('backend', 'info', 'route', 'scheduled task');
        
        res.status(201).json({ status: 'success', data: obj });
    } catch (err) {
        await Log('backend', 'error', 'route', err.message);
        res.status(500).json({ error: err.message });
    }
};

exports.markCompleted = async (req, res) => {
    try {
        let id = req.params.id;
        let found = false;
        let task = null;

        for (let i = 0; i < tasks.length; i++) {
            if (tasks[i].id === id) {
                tasks[i].status = 'COMPLETED';
                task = tasks[i];
                found = true;
                break;
            }
        }
        
        if (!found) {
            await Log('backend', 'warn', 'route', 'task missing');
            return res.status(404).json({ error: 'not found' });
        }
        
        await Log('backend', 'info', 'route', 'task done');
        res.json({ status: 'success', data: task });
    } catch (err) {
        await Log('backend', 'error', 'route', err.message);
        res.status(500).json({ error: err.message });
    }
};
