const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const { SourceMapDevToolPlugin } = require("webpack");
const path = require("node:path");

module.exports = {
    entry: {
        app: path.resolve(__dirname, "src/dashboard/public.src/index.js"),
    },
    output: {
        filename: "[name].bundle.js",
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
        new MiniCssExtractPlugin(),
        new SourceMapDevToolPlugin({
            filename: "[file].map",
        }),
    ],
    optimization: {
        minimizer: [new CssMinimizerPlugin()],
    },
};
