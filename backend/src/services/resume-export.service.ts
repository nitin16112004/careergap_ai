import { getSupabaseStorageClient } from "../config/supabase";
import type { GeneratedResumeContent, GeneratedResumeRecord } from "../types/ats-resume";
import { HttpError } from "../utils/http-error";

const GENERATED_RESUME_BUCKET = "generated-resumes";
const SIGNED_URL_TTL_SECONDS = 15 * 60;

type ExportFormat = "pdf" | "docx";

export interface ResumeExportResult {
    format: ExportFormat;
    storagePath: string;
    url: string;
    expiresIn: number;
    fileName: string;
}

const text = (value: unknown): string => typeof value === "string" ? value.trim() : "";

const safeFileStem = (value: string): string => {
    const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return normalized || "resume";
};

const resumeFileName = (record: GeneratedResumeRecord, format: ExportFormat): string => {
    const name = safeFileStem(record.resume_content.personalInfo.name || "resume");
    const role = safeFileStem(record.target_role || "ats");
    return `${name}-${role}.${format}`;
};

const resumeLines = (content: GeneratedResumeContent, targetRole: string): string[] => {
    const lines: string[] = [];
    const add = (...values: string[]): void => { lines.push(...values.filter((value) => value !== undefined)); };
    const contact = [content.personalInfo.email, content.personalInfo.phone, content.personalInfo.city].filter(Boolean).join(" | ");

    add(content.personalInfo.name || "Resume");
    if (targetRole) add(`Target role: ${targetRole}`);
    if (contact) add(contact);
    add("");

    if (content.summary) add("SUMMARY", content.summary, "");
    if (content.skills.length) add("SKILLS", content.skills.join(" | "), "");

    if (content.experience.length) {
        add("EXPERIENCE");
        for (const item of content.experience) {
            const heading = [item.role, item.company, item.period].filter(Boolean).join(" | ");
            if (heading) add(heading);
            if (item.details) add(item.details);
        }
        add("");
    }

    if (content.projects.length) {
        add("PROJECTS");
        for (const project of content.projects) {
            if (project.name) add(project.name);
            if (project.details) add(project.details);
            if (project.impact) add(project.impact);
        }
        add("");
    }

    if (content.education.length) {
        add("EDUCATION");
        for (const item of content.education) {
            const entry = [item.institution, item.details].filter(Boolean).join(" | ");
            if (entry) add(entry);
        }
        add("");
    }

    if (content.certifications.length) add("CERTIFICATIONS", ...content.certifications, "");

    const links = [content.links.linkedin, content.links.github, content.links.portfolio].filter(Boolean) as string[];
    if (links.length) add("LINKS", ...links);

    return lines;
};

const wrapText = (value: string, width = 86): string[] => {
    if (!value) return [""];
    const words = value.replace(/\s+/g, " ").trim().split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
        const next = current ? `${current} ${word}` : word;
        if (next.length <= width) current = next;
        else {
            if (current) lines.push(current);
            current = word.length <= width ? word : word.slice(0, width);
        }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [""];
};

const pdfSafe = (value: string): string => value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

export const createResumePdf = (content: GeneratedResumeContent, targetRole: string): Buffer => {
    const wrapped = resumeLines(content, targetRole).flatMap((line) => wrapText(line));
    const linesPerPage = 48;
    const pages: string[][] = [];
    for (let index = 0; index < wrapped.length; index += linesPerPage) pages.push(wrapped.slice(index, index + linesPerPage));
    if (!pages.length) pages.push(["Resume"]);

    const pageCount = pages.length;
    const fontObjectId = 3 + (pageCount * 2);
    const objects = new Map<number, string>();
    const pageIds = pages.map((_, index) => 3 + index);
    const contentIds = pages.map((_, index) => 3 + pageCount + index);

    objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
    objects.set(2, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageCount} >>`);
    objects.set(fontObjectId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

    pages.forEach((pageLines, index) => {
        const pageId = pageIds[index];
        const contentId = contentIds[index];
        const streamLines = ["BT", "/F1 10 Tf", "50 750 Td", "13 TL"];
        for (const line of pageLines) {
            if (line) streamLines.push(`(${pdfSafe(line)}) Tj`);
            streamLines.push("T*");
        }
        streamLines.push("ET");
        const stream = streamLines.join("\n");
        objects.set(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentId} 0 R >>`);
        objects.set(contentId, `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`);
    });

    const maxObjectId = fontObjectId;
    const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n", "ascii")];
    const offsets: number[] = new Array(maxObjectId + 1).fill(0);
    let length = chunks[0].length;

    for (let id = 1; id <= maxObjectId; id += 1) {
        offsets[id] = length;
        const object = Buffer.from(`${id} 0 obj\n${objects.get(id) ?? "<<>>"}\nendobj\n`, "ascii");
        chunks.push(object);
        length += object.length;
    }

    const xrefOffset = length;
    const xref = ["xref", `0 ${maxObjectId + 1}`, "0000000000 65535 f "];
    for (let id = 1; id <= maxObjectId; id += 1) xref.push(`${String(offsets[id]).padStart(10, "0")} 00000 n `);
    xref.push("trailer", `<< /Size ${maxObjectId + 1} /Root 1 0 R >>`, "startxref", String(xrefOffset), "%%EOF", "");
    chunks.push(Buffer.from(xref.join("\n"), "ascii"));
    return Buffer.concat(chunks);
};

const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
        let value = n;
        for (let k = 0; k < 8; k += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
        table[n] = value >>> 0;
    }
    return table;
})();

const crc32 = (buffer: Buffer): number => {
    let crc = 0xffffffff;
    for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
};

const dosDateTime = (date = new Date()): { time: number; date: number } => ({
    time: ((date.getHours() & 0x1f) << 11) | ((date.getMinutes() & 0x3f) << 5) | ((Math.floor(date.getSeconds() / 2)) & 0x1f),
    date: (((date.getFullYear() - 1980) & 0x7f) << 9) | (((date.getMonth() + 1) & 0x0f) << 5) | (date.getDate() & 0x1f),
});

interface ZipEntry {
    name: string;
    data: Buffer;
}

const createStoredZip = (entries: ZipEntry[]): Buffer => {
    const localParts: Buffer[] = [];
    const centralParts: Buffer[] = [];
    let localOffset = 0;
    const stamp = dosDateTime();

    for (const entry of entries) {
        const name = Buffer.from(entry.name, "utf8");
        const crc = crc32(entry.data);
        const localHeader = Buffer.alloc(30);
        localHeader.writeUInt32LE(0x04034b50, 0);
        localHeader.writeUInt16LE(20, 4);
        localHeader.writeUInt16LE(0x0800, 6);
        localHeader.writeUInt16LE(0, 8);
        localHeader.writeUInt16LE(stamp.time, 10);
        localHeader.writeUInt16LE(stamp.date, 12);
        localHeader.writeUInt32LE(crc, 14);
        localHeader.writeUInt32LE(entry.data.length, 18);
        localHeader.writeUInt32LE(entry.data.length, 22);
        localHeader.writeUInt16LE(name.length, 26);
        localHeader.writeUInt16LE(0, 28);
        localParts.push(localHeader, name, entry.data);

        const centralHeader = Buffer.alloc(46);
        centralHeader.writeUInt32LE(0x02014b50, 0);
        centralHeader.writeUInt16LE(20, 4);
        centralHeader.writeUInt16LE(20, 6);
        centralHeader.writeUInt16LE(0x0800, 8);
        centralHeader.writeUInt16LE(0, 10);
        centralHeader.writeUInt16LE(stamp.time, 12);
        centralHeader.writeUInt16LE(stamp.date, 14);
        centralHeader.writeUInt32LE(crc, 16);
        centralHeader.writeUInt32LE(entry.data.length, 20);
        centralHeader.writeUInt32LE(entry.data.length, 24);
        centralHeader.writeUInt16LE(name.length, 28);
        centralHeader.writeUInt16LE(0, 30);
        centralHeader.writeUInt16LE(0, 32);
        centralHeader.writeUInt16LE(0, 34);
        centralHeader.writeUInt16LE(0, 36);
        centralHeader.writeUInt32LE(0, 38);
        centralHeader.writeUInt32LE(localOffset, 42);
        centralParts.push(centralHeader, name);
        localOffset += localHeader.length + name.length + entry.data.length;
    }

    const centralDirectory = Buffer.concat(centralParts);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(0, 4);
    end.writeUInt16LE(0, 6);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(centralDirectory.length, 12);
    end.writeUInt32LE(localOffset, 16);
    end.writeUInt16LE(0, 20);
    return Buffer.concat([...localParts, centralDirectory, end]);
};

const xmlEscape = (value: string): string => value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const wordParagraph = (value: string, bold = false): string => {
    if (!value) return "<w:p/>";
    const property = bold ? "<w:rPr><w:b/></w:rPr>" : "";
    return `<w:p><w:r>${property}<w:t xml:space="preserve">${xmlEscape(value)}</w:t></w:r></w:p>`;
};

export const createResumeDocx = (content: GeneratedResumeContent, targetRole: string): Buffer => {
    const paragraphs: string[] = [];
    paragraphs.push(wordParagraph(content.personalInfo.name || "Resume", true));
    if (targetRole) paragraphs.push(wordParagraph(`Target role: ${targetRole}`));
    const contact = [content.personalInfo.email, content.personalInfo.phone, content.personalInfo.city].filter(Boolean).join(" | ");
    if (contact) paragraphs.push(wordParagraph(contact));

    const section = (heading: string, values: string[]): void => {
        if (!values.length) return;
        paragraphs.push(wordParagraph(heading, true));
        paragraphs.push(...values.map((value) => wordParagraph(value)));
    };

    section("SUMMARY", content.summary ? [content.summary] : []);
    section("SKILLS", content.skills.length ? [content.skills.join(" | ")] : []);
    section("EXPERIENCE", content.experience.flatMap((item) => {
        const values: string[] = [];
        const heading = [item.role, item.company, item.period].filter(Boolean).join(" | ");
        if (heading) values.push(heading);
        if (item.details) values.push(item.details);
        return values;
    }));
    section("PROJECTS", content.projects.flatMap((item) => [item.name, item.details, item.impact ?? ""].filter(Boolean)));
    section("EDUCATION", content.education.map((item) => [item.institution, item.details].filter(Boolean).join(" | ")).filter(Boolean));
    section("CERTIFICATIONS", content.certifications);
    section("LINKS", [content.links.linkedin, content.links.github, content.links.portfolio].filter(Boolean) as string[]);

    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs.join("")}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr></w:body></w:document>`;
    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
    const relationships = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

    return createStoredZip([
        { name: "[Content_Types].xml", data: Buffer.from(contentTypes, "utf8") },
        { name: "_rels/.rels", data: Buffer.from(relationships, "utf8") },
        { name: "word/document.xml", data: Buffer.from(documentXml, "utf8") },
    ]);
};

export const resumeExportService = {
    async export(userId: string, record: GeneratedResumeRecord, format: ExportFormat): Promise<ResumeExportResult> {
        if (record.user_id !== userId) throw new HttpError(404, "Generated resume not found.", "ATS_GENERATED_RESUME_NOT_FOUND");
        const buffer = format === "pdf"
            ? createResumePdf(record.resume_content, record.target_role)
            : createResumeDocx(record.resume_content, record.target_role);
        const storagePath = `${userId}/${record.id}/${resumeFileName(record, format)}`;
        const contentType = format === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        const client = getSupabaseStorageClient();
        const { error: uploadError } = await client.storage.from(GENERATED_RESUME_BUCKET).upload(storagePath, buffer, {
            contentType,
            upsert: true,
        });
        if (uploadError) throw new HttpError(502, `Unable to create the ${format.toUpperCase()} resume file.`, "ATS_EXPORT_UPLOAD_FAILED", false);

        const pathColumn = format === "pdf" ? "pdf_storage_path" : "docx_storage_path";
        const { error: updateError } = await client.from("generated_resumes").update({ [pathColumn]: storagePath }).eq("id", record.id).eq("user_id", userId);
        if (updateError) throw new HttpError(500, "Resume file was created but its storage metadata could not be saved.", "ATS_EXPORT_METADATA_FAILED", false);

        const { data: signed, error: signedError } = await client.storage.from(GENERATED_RESUME_BUCKET).createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
        if (signedError || !signed?.signedUrl) throw new HttpError(502, "Unable to create a secure download link.", "ATS_EXPORT_SIGNED_URL_FAILED", false);

        return {
            format,
            storagePath,
            url: signed.signedUrl,
            expiresIn: SIGNED_URL_TTL_SECONDS,
            fileName: resumeFileName(record, format),
        };
    },
};
