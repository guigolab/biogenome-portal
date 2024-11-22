import { DataModels } from "../data/types";

export function useDownload(model: DataModels, data: any) {
    const href = URL.createObjectURL(data);

    const filename = `${model}_report.tsv`
    // create "a" HTML element with href to file & click
    const link = document.createElement('a');
    link.href = href;
    link.setAttribute('download', filename); //or any other extension
    document.body.appendChild(link);
    link.click();
    // clean up "a" element & remove ObjectURL
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
}