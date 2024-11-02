import * as path from "jsr:@std/path";
import { readAll } from "jsr:@std/io/read-all";
import { existsSync } from "jsr:@std/fs";
import { parseArgs } from "jsr:@std/cli/parse-args";
import { PDFDocument } from "https://cdn.skypack.dev/pdf-lib?dts";

const concFiles = async (paths: string[], outname: string): Promise<number> => {
    if (outname.endsWith(".pdf")) {
        outname = outname.substring(0, outname.length - 4);
    }
    const outDoc = await PDFDocument.create();

    const promises = paths.map(async (path) => {
        const data = await Deno.readFile(path);
        const srcDoc = await PDFDocument.load(data);
        const range = srcDoc.getPageIndices();
        const pages = await outDoc.copyPages(srcDoc, range);
        pages.forEach((page) => outDoc.addPage(page));
    });

    await Promise.all(promises);

    const bytes = await outDoc.save();
    const outPath = path.join(Deno.cwd(), outname + ".pdf");
    await Deno.writeFile(outPath, bytes);

    return 0;
};

const main = async () => {
    const flags = parseArgs(Deno.args, {
        string: ["outname"],
        default: {
            outname: "conc",
        },
    });

    if (Deno.stdin.isTerminal()) {
        console.log("pipe pdf path to this command.");
        Deno.exit(1);
    }

    const si = await readAll(Deno.stdin);
    const decoder = new TextDecoder();
    const s = decoder.decode(si);
    const paths = s.split("\n").map((l) => l.trim()).filter((l) => 0 < l.length)
        .filter((l) => existsSync(l) && l.endsWith(".pdf"));
    const result = await concFiles(paths, flags.outname);
    Deno.exit(result);
};

main();
