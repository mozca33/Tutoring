"use client";

import dynamic from "next/dynamic";

// react-pdf é browser-only — carrega apenas no cliente.
const PdfAnnotator = dynamic(() => import("./pdf-annotator"), { ssr: false });

export default PdfAnnotator;
