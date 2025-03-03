const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const { SourceMapDevToolPlugin } = require("webpack");
const path = require("node:path");

module.exports = {
    entry: {
        app: path.resolve(__dirname, "src/index.js"),
    },
    output: {
        filename: "js/[name].js",
        path: path.resolve(__dirname, "public/"),
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
        extensions: ["", ".js", ".css"],
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
