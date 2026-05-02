const { v4: uuidv4 } = require('uuid');

let arr = [
    {
        id: uuidv4(),
        studentId: '1042',
        type: 'PLACEMENT',
        title: 'Interview',
        message: 'Google interview soon',
        isRead: false,
        createdAt: new Date().toISOString(),
    },
    {
        id: uuidv4(),
        studentId: '1042',
        type: 'EVENT',
        title: 'Hackathon',
        message: 'Join now',
        isRead: false,
        createdAt: new Date().toISOString(),
    }
];

class NotifModel {
    static async getAll(sId, page = 1, limit = 20, type, isRead) {
        let temp = [];
        for (let i = 0; i < arr.length; i++) {
            if (arr[i].studentId === sId) {
                temp.push(arr[i]);
            }
        }

        if (type) {
            let t2 = [];
            for (let i = 0; i < temp.length; i++) {
                if (temp[i].type === type) t2.push(temp[i]);
            }
            temp = t2;
        }
        
        if (isRead !== undefined) {
            let t3 = [];
            let val = (isRead === 'true');
            for (let i = 0; i < temp.length; i++) {
                if (temp[i].isRead === val) t3.push(temp[i]);
            }
            temp = t3;
        }

        temp.sort((a, b) => {
            let d1 = new Date(a.createdAt);
            let d2 = new Date(b.createdAt);
            if (d1 < d2) return 1;
            if (d1 > d2) return -1;
            return 0;
        });

        let start = (page - 1) * limit;
        let paged = temp.slice(start, start + parseInt(limit));

        return {
            notifications: paged
        };
    }

    static async markRead(id) {
        for (let i = 0; i < arr.length; i++) {
            if (arr[i].id === id) {
                arr[i].isRead = true;
                return arr[i];
            }
        }
        return null;
    }

    static async deleteOne(id) {
        let oldLen = arr.length;
        let temp = [];
        for (let i = 0; i < arr.length; i++) {
            if (arr[i].id !== id) {
                temp.push(arr[i]);
            }
        }
        arr = temp;
        if (arr.length < oldLen) return true;
        return false;
    }

    static async unreadCount(sId) {
        let c = 0;
        for (let i = 0; i < arr.length; i++) {
            if (arr[i].studentId === sId && arr[i].isRead === false) {
                c++;
            }
        }
        return c;
    }

    static async create(data) {
        let obj = {
            id: uuidv4(),
            studentId: data.studentId,
            type: data.type,
            title: data.title,
            message: data.message,
            isRead: false,
            createdAt: new Date().toISOString()
        };
        arr.push(obj);
        return obj;
    }
}

module.exports = NotifModel;
