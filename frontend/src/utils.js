function truncateTitle(title, max = 25) {
    if (title.length > max) {
        return title.substring(0, max - 3) + '...';
    }
    else {
        return title;
    }
}

module.exports = {
    truncateTitle,
};
