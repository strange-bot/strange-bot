/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
module.exports.getHealth = function (req, res) {
    const ipcConnected = !!req.app.ipcClient;
    res.json({
        success: true,
        data: {
            app: "dashboard",
            uptime: process.uptime(),
            ipcConnected,
            time: new Date().toISOString(),
        },
    });
};

module.exports.getStats = async function (req, res) {
    try {
        const ipcResp = await req.app.ipcClient.broadcast("getStats");
        let stats = { servers: 100, users: 10000, plugins: 20 };

        if (!ipcResp.find((r) => !r.success)) {
            stats = ipcResp.reduce(
                (acc, resp) => {
                    acc.servers += resp.data.servers;
                    acc.users += resp.data.users;
                    acc.plugins = resp.data.plugins;
                    return acc;
                },
                { servers: 0, users: 0, plugins: 0 },
            );
        }

        res.json({ success: true, data: stats });
    } catch (err) {
        res.status(500).json({ success: false, error: "failed to fetch stats" });
    }
};
