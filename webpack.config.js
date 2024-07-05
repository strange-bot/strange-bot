const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const { SourceMapDevToolPlugin } = require("webpack");
const path = require("node:path");

module.exports = {
    entry: {
        "app": path.resolve(__dirname, "src/dashboard/src/index.js"),
        "codemirror": path.resolve(__dirname, "src/dashboard/src/codemirror.js"),
        "landing": path.resolve(__dirname, "src/dashboard/src/landing.js"),
        "plugin-localization": path.resolve(__dirname, "src/dashboard/src/plugin-localization.js"),
    },
    output: {
        filename: "js/[name].js",
        path: path.resolve(__dirname, "src/dashboard/public/"),
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, "css-loader", "postcss-loader"],
            },
        ],
    },
    resolve: {
        extensions: ["", ".js", ".jsx", ".css"],
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: "css/[name].css",
        }),
        new SourceMapDevToolPlugin({
            filename: "[file].map",
        }),
    ],
    optimization: {
        minimizer: [new TerserPlugin(), new CssMinimizerPlugin()],
    },
};
