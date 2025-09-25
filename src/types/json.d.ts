
declare module "*.json" {
    const value: {
        version: string;
        [key: string]: any;
    };
    export default value;
}
