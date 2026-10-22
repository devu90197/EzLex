const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'Indian Penal Code Complete Dataset.json');
const csvPath = path.join(__dirname, 'Indian Penal Code Complete Dataset.csv');

try {
  // Read the JSON file
  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(rawData);

  // Prepare CSV header
  let csvContent = 'title,content,metadata\n';

  // Iterate over each item and format it for the legal_knowledge table
  data.forEach((item) => {
    // Escape quotes for CSV
    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '';
      return String(str).replace(/"/g, '""');
    };

    const chapterNum = item.chapter || '';
    const chapterTitle = item.chapter_title || '';
    const sectionNum = item.Section || '';
    const sectionTitle = item.section_title || '';
    const sectionDesc = item.section_desc || '';

    // Title format
    const title = `IPC Section ${sectionNum}: ${sectionTitle}`;
    
    // Content format: Combine Chapter info with Section info for better RAG context
    const content = `Chapter ${chapterNum}: ${chapterTitle}\nSection ${sectionNum}: ${sectionTitle}\n\n${sectionDesc}`;

    // Metadata format: Store the exact raw JSON object
    const metadata = JSON.stringify(item);

    // Add row to CSV
    csvContent += `"${escapeCsv(title)}","${escapeCsv(content)}","${escapeCsv(metadata)}"\n`;
  });

  // Write to CSV file
  fs.writeFileSync(csvPath, csvContent, 'utf-8');
  console.log(`Successfully created CSV with ${data.length} perfectly formatted rows, including Chapters and all metadata!`);

} catch (error) {
  console.error('Error during conversion:', error);
}
