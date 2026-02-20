const axios = require('axios');

async function testExecute() {
    try {
        console.log("Testing backend code execution at http://localhost:5000/api/execute...");
        const response = await axios.post('http://localhost:5000/api/execute', {
            language: 'javascript',
            code: 'console.log("Hello from backend test script!")'
        });
        console.log("SUCCESS!");
        console.log("Output:", response.data.run.output);
    } catch (err) {
        console.error("FAILED!");
        if (err.response) {
            console.error("Status:", err.response.status);
            console.error("Data:", err.response.data);
        } else {
            console.error("Error:", err.message);
        }
    }
}

testExecute();
