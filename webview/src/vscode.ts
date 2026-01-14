// VS Code API wrapper for webview
declare const acquireVsCodeApi: any; // This line is kept to maintain `acquireVsCodeApi` declaration
// Wrapper for VS Code API
// @ts-ignore
const vsCodeApi = acquireVsCodeApi();

export const vscode = {
    postMessage: (message: any) => {
        vsCodeApi.postMessage(message);
    },
    setState: (newState: any) => {
        vsCodeApi.setState(newState);
    },
    getState: () => {
        return vsCodeApi.getState();
    }
};

export const postMessage = vscode.postMessage;
export default vscode;
