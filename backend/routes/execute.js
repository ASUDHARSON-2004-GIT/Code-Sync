const express = require('express');
const router = express.Router();
const axios = require('axios');

const LANGUAGE_VERSIONS = {
    javascript: "18.15.0",
    python: "3.10.0",
    cpp: "10.2.0",
    java: "15.0.2",
};

router.post('/', async (req, res) => {
    const { language, code } = req.body;
    console.log(`Execution request received: language=${language}, codeLength=${code?.length}`);

    if (!language || !code) {
        return res.status(400).json({ message: 'Language and code are required.' });
    }

    if (!LANGUAGE_VERSIONS[language]) {
        return res.status(400).json({ message: `Language '${language}' is not supported. Supported: ${Object.keys(LANGUAGE_VERSIONS).join(', ')}` });
    }

    try {
        // Piston V1 - still publicly accessible
        const response = await axios.post(
            'https://emkc.org/api/v1/piston/execute',
            { language: language, source: code },
            { timeout: 25000, headers: { 'Content-Type': 'application/json' } }
        );

        const data = response.data;
        console.log(`Execution result for ${language}: ran=${data.ran}, output length=${data.output?.length}`);

        return res.json({
            run: {
                output: data.output || '',
                stdout: data.stdout || '',
                stderr: data.stderr || ''
            }
        });
    } catch (err) {
        const errData = err.response?.data || err.message;
        const status = err.response?.status || 500;
        console.error('Piston API Error:', status, errData);
        return res.status(500).json({
            message: 'Failed to execute code. The execution service may be unavailable.',
            error: errData
        });
    }
});

module.exports = router;
