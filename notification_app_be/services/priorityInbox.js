class PriorityService {
    static getTop(list, limit) {
        let unread = [];
        for (let i = 0; i < list.length; i++) {
            if (list[i].isRead === false) {
                unread.push(list[i]);
            }
        }

        unread.sort((a, b) => {
            let wa = 0;
            if (a.type === 'PLACEMENT') wa = 3;
            if (a.type === 'RESULT') wa = 2;
            if (a.type === 'EVENT') wa = 1;

            let wb = 0;
            if (b.type === 'PLACEMENT') wb = 3;
            if (b.type === 'RESULT') wb = 2;
            if (b.type === 'EVENT') wb = 1;

            if (wa > wb) return -1;
            if (wa < wb) return 1;

            let da = new Date(a.createdAt);
            let db = new Date(b.createdAt);
            if (da > db) return -1;
            if (da < db) return 1;
            return 0;
        });

        let result = [];
        for (let i = 0; i < unread.length; i++) {
            if (i < limit) {
                result.push(unread[i]);
            }
        }
        return result;
    }
}

module.exports = PriorityService;
