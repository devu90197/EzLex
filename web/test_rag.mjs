async function testRAG() {
  console.log("Testing new Gemini RAG Pipeline...");
  try {
    const response = await fetch('http://localhost:3000/api/ai/rights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: "What is the punishment for cheating or fraud according to the IPC?",
        language: "English"
      })
    });

    const data = await response.json();
    console.log("RAG API RESPONSE STATUS:", response.status);
    console.log("RAG FINAL ANSWER:\n");
    console.log(data.response || data.error);
  } catch (err) {
    console.error("Test Request Failed:", err);
  }
}

testRAG();
