const exampleActionFiles = {
  findTop100AdClickingUsers: `
    SELECT user_id, COUNT(*) as clicks FROM $[app-usage-data.ad_clicks] GROUP BY user_id ORDER BY clicks DESC LIMIT 100 JOIN $[app-usage-data.users] ON $[app-usage-data.ad_clicks].user_id = $[app-usage-data.users].id;
  `,
  sendReceiptOnOrder: `
    const irmin = require('irmin');
    const fetch = require('node-fetch');

    async function sendReceipts() {
        try {
            // Fetch orders where receipt_sent is false
            const result = await irmin.query("SELECT * FROM $[app-usage-data.purchase_events] WHERE receipt_sent = false");
            const orders = result.rows;

            for (const order of orders) {
                try {
                    // Send receipt for each order
                    const response = await fetch('https://api.example.com/send-receipt', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(order)
                    });

                    if (response.ok) {
                        irmin.log("success", "Successfully sent receipt for order " + order.id);
                    } else {
                        irmin.log("warning", "Failed to send receipt for order " + order.id + ": " + response.statusText);
                    }
                } catch (error) {
                    irmin.log("warning", "Error sending receipt for order " + order.id + ": " + error.message);
                }
            }

            // Return null to avoid creating a Repository based on this action
            irmin.actionResult(null);
        } catch (error) {
            irmin.log("error", "Error fetching orders: " + error.message);
        }
    }

    (async () => {
        try {
            irmin.log("info", "Running sendReceipts action");
            await sendReceipts();
        } catch (error) {
            irmin.log("error", "Error in sendReceipts execution: " + error.message);
        }
    })();
    `,
  fetchAppUsageData: `
    const irmin = require('irmin');
    const fetch = require('node-fetch');
    async function fetchAppUsageData() {
        try {
            // Fetch app usage data from API
            const response = await fetch('https://api.example.com/app-usage-data');
            const data = await response.json();

            // Return the data to create a Repository based on this action
            irmin.actionResult(data);
        } catch (error) {
            irmin.log("error", "Error fetching app usage data: " + error.message);
        }
    }
    (async () => {
        try {
            irmin.log("info", "Running fetchAppUsageData action");
            await fetchAppUsageData();
        } catch (error) {
            irmin.log("error", "Error in fetchAppUsageData execution: " + error.message);
        }
    })();
    `,
};
export default exampleActionFiles;
