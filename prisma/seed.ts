import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as fs from "fs";
import * as path from "path";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

// ─── Typedefs matching the JSON export format ─────────────
interface ExportedFence {
  name: string;
  section: string;
  sectionColor: string;
  checked: boolean;
  notes: string;
  components: {
    type: string;
    count: string;
    desc: string;
    bomId: string;
  }[];
  img?: string;
}

interface ExportedPP {
  name: string;
  section: string;
  sectionColor: string;
  checked: boolean;
  count: string;
  bomId: string;
  note: string;
  img?: string;
}

interface ExportedData {
  version: string;
  exportedAt: string;
  device: string;
  fences: ExportedFence[];
  pp: ExportedPP[];
}

// ─── Helpers to parse section metadata ────────────────────

function parsePPSectionType(sectionName: string): string {
  const lower = sectionName.toLowerCase();
  if (lower.includes("gate") || lower.includes("filler") || lower.includes("vatten")) return "gate";
  if (lower.includes("plank")) return "plank";
  return "pole";
}

function parsePPLength(sectionName: string): number {
  if (sectionName.includes("3,20") || sectionName.includes("3.20")) return 3.2;
  if (sectionName.includes("3,0") || sectionName.includes("3.0")) return 3.0;
  return 2.5;
}

function parsePPWidth(sectionName: string): number {
  const lower = sectionName.toLowerCase();
  if (lower.includes("plank")) return 0.2;
  return 0.1;
}

// ─── Main seed function ───────────────────────────────────

async function main() {
  // Find the latest JSON export file
  const dataDir = path.resolve(__dirname, "../../GHS 2026");
  const jsonFile = path.join(dataDir, "GHS_2026_inventering_2026-02-18_1454.json");

  if (!fs.existsSync(jsonFile)) {
    console.error(`Data file not found: ${jsonFile}`);
    process.exit(1);
  }

  console.log(`📂 Reading data from: ${jsonFile}`);
  const raw: ExportedData = JSON.parse(fs.readFileSync(jsonFile, "utf-8"));
  console.log(`   Found ${raw.fences.length} fences and ${raw.pp.length} poles/planks`);

  // ─── Clear existing data ─────────────────────────────────
  console.log("\n🗑️  Clearing existing data...");
  await prisma.fenceComponent.deleteMany();
  await prisma.fenceImage.deleteMany();
  await prisma.fence.deleteMany();
  await prisma.poleOrPlank.deleteMany();
  await prisma.section.deleteMany();
  console.log("   Done.");

  // ─── Create fence sections ───────────────────────────────
  console.log("\n📋 Creating fence sections...");
  const fenceSectionMap = new Map<string, string>(); // section name -> id
  const seenFenceSections = new Set<string>();

  for (const f of raw.fences) {
    if (!seenFenceSections.has(f.section)) {
      seenFenceSections.add(f.section);
    }
  }

  let sortOrder = 0;
  for (const sectionName of seenFenceSections) {
    const fence = raw.fences.find((f) => f.section === sectionName)!;
    const section = await prisma.section.create({
      data: {
        name: sectionName,
        color: fence.sectionColor,
        type: "fence",
        sortOrder: sortOrder++,
      },
    });
    fenceSectionMap.set(sectionName, section.id);
    console.log(`   ✅ ${sectionName} (${fence.sectionColor})`);
  }

  // ─── Create PP sections ──────────────────────────────────
  console.log("\n📋 Creating Poles & Planks sections...");
  const ppSectionMap = new Map<string, string>();
  const seenPPSections: { name: string; color: string }[] = [];
  const seenPPSet = new Set<string>();

  for (const p of raw.pp) {
    if (!seenPPSet.has(p.section)) {
      seenPPSet.add(p.section);
      seenPPSections.push({ name: p.section, color: p.sectionColor });
    }
  }

  for (const s of seenPPSections) {
    const section = await prisma.section.create({
      data: {
        name: s.name,
        color: s.color,
        type: "pp",
        sortOrder: sortOrder++,
      },
    });
    ppSectionMap.set(s.name, section.id);
    console.log(`   ✅ ${s.name} (${s.color})`);
  }

  // ─── Import fences ───────────────────────────────────────
  console.log("\n🏇 Importing fences...");
  let fenceOrder = 0;

  for (const f of raw.fences) {
    const sectionId = fenceSectionMap.get(f.section)!;

    const fence = await prisma.fence.create({
      data: {
        name: f.name,
        sectionId,
        checked: f.checked,
        notes: f.notes || "",
        sortOrder: fenceOrder++,
      },
    });

    // Create primary image if exists
    if (f.img && f.img.startsWith("data:")) {
      await prisma.fenceImage.create({
        data: {
          fenceId: fence.id,
          imageUrl: f.img,
          caption: "",
          isPrimary: true,
          sortOrder: 0,
        },
      });
    }

    // Create components
    for (const c of f.components) {
      await prisma.fenceComponent.create({
        data: {
          fenceId: fence.id,
          type: c.type,
          count: parseInt(c.count) || 0,
          description: c.desc || "",
          bomId: c.bomId || "",
        },
      });
    }

    console.log(
      `   ✅ ${f.name} (${f.components.length} components${f.img ? ", with image" : ""})`
    );
  }

  // ─── Import Poles & Planks ───────────────────────────────
  console.log("\n📏 Importing Poles & Planks...");
  let ppOrder = 0;

  for (const p of raw.pp) {
    const sectionId = ppSectionMap.get(p.section)!;
    const ppType = parsePPSectionType(p.section);
    const ppLength = parsePPLength(p.section);
    const ppWidth = parsePPWidth(p.section);

    await prisma.poleOrPlank.create({
      data: {
        name: p.name,
        sectionId,
        type: ppType,
        length: ppLength,
        width: ppWidth,
        colorPattern: [],  // Will be populated with color editor later
        colorImage: p.img || "",
        checked: p.checked,
        count: parseInt(p.count) || 0,
        bomId: p.bomId || "",
        note: p.note || "",
        sortOrder: ppOrder++,
      },
    });

    console.log(
      `   ✅ ${p.name} (${p.section}, count: ${p.count}${p.img ? ", with color bar" : ""})`
    );
  }

  // ─── Summary ─────────────────────────────────────────────
  const fenceCount = await prisma.fence.count();
  const componentCount = await prisma.fenceComponent.count();
  const imageCount = await prisma.fenceImage.count();
  const ppCount = await prisma.poleOrPlank.count();
  const sectionCount = await prisma.section.count();

  console.log("\n═══════════════════════════════════════════");
  console.log("🎉 Seed complete!");
  console.log(`   📋 ${sectionCount} sections`);
  console.log(`   🏇 ${fenceCount} fences`);
  console.log(`   🔧 ${componentCount} components`);
  console.log(`   📷 ${imageCount} images`);
  console.log(`   📏 ${ppCount} poles & planks`);
  console.log("═══════════════════════════════════════════\n");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
