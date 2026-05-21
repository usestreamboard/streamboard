---
name: streamboard-login
description: Authenticate with streamboard for CLI access via device flow
disable-model-invocation: true
allowed-tools: Bash(streamboard *), AskUserQuestion
---

# Authenticate with streamboard

Log in to streamboard using the device authorization flow.

## Steps

1. Run `streamboard auth request` to initiate the device flow. Parse the JSON response.

2. Tell the user exactly this (filling in the values from the response):

   > To log in, open **{verification_uri}** in your browser and enter code: **{user_code}**

   Do NOT show `verification_uri_complete` or `device_code` to the user.

3. Ask the user to confirm once they have completed authorization in their browser.

4. Run `streamboard auth poll <device_code>` using the `device_code` from step 1.

5. Check the result:
   - `"complete"` — confirm login succeeded. Run `streamboard whoami` to verify.
   - `"pending"` — tell the user it hasn't completed yet and ask them to try again, then repeat step 4.
   - Error — show the error message and suggest starting over.
