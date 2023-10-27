const { format } = require('date-fns');

function truncateTitle(title, max = 25) {
    if (title.length > max) {
        return title.substring(0, max - 3) + '...';
    }
    else {
        return title;
    }
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return format(date, "yyyy-MM-dd HH:mm:ss");
}

module.exports = {
    formatTime,
    truncateTitle,
};
