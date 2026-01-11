// ============================================
// VERCEL SERVERLESS FUNCTION
// This receives data from your website and forwards it to Power Automate
// ============================================

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Method not allowed. Use POST.' 
        });
    }
    
    try {
        // Get data from your website
        const formData = req.body;
        
        // Validate required fields
        if (!formData.workOrderNo) {
            return res.status(400).json({ 
                error: 'Work Order Number is required' 
            });
        }
        
        if (!formData.dealer) {
            return res.status(400).json({ 
                error: 'Dealer is required' 
            });
        }
        
        // Power Automate webhook URL
        // REPLACE THIS with your actual webhook URL from Power Automate
        const powerAutomateUrl = 'PASTE_YOUR_POWER_AUTOMATE_WEBHOOK_URL_HERE';
        
        console.log('Sending data to Power Automate:', formData);
        
        // Forward data to Power Automate
        const paResponse = await fetch(powerAutomateUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        // Check Power Automate response
        if (paResponse.ok) {
            console.log('✅ Power Automate accepted the data');
            return res.status(200).json({ 
                success: true,
                message: 'Data synced to Teams lists successfully'
            });
        } else {
            const errorText = await paResponse.text();
            console.error('❌ Power Automate error:', errorText);
            
            return res.status(500).json({ 
                success: false,
                error: 'Power Automate rejected the data',
                details: errorText
            });
        }
        
    } catch (error) {
        console.error('❌ Server error:', error);
        
        return res.status(500).json({ 
            success: false,
            error: 'Failed to sync to Teams',
            details: error.message
        });
    }
}