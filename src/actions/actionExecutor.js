export async function executeAction(action) {
    console.log("Executing action:", action);

    switch (action.type) {

        case "SEND_EMAIL":
            return await sendEmail(action.payload);

        case "CREATE_TASK":
            return await createTask(action.payload);

        case "LOG":
            console.log("Log:", action.payload);
            return { status: "logged" };

        default:
            console.log("Unknown action");
            return { status: "unknown_action" };
    }
}

async function sendEmail(data) {
    console.log("Sending Email to:", data.to);

    return {
        status: "success",
        message: `Email sent to ${data.to}`
    };
}

async function createTask(data) {
    console.log("Creating Task:", data.title);

    return {
        status: "success",
        message: `Task "${data.title}" created`
    };
}
