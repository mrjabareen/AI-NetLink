# NetLink Publisher

Windows release publisher for AI-NetLink.

## What It Does

- Picks the project folder even if the project was moved to a different path.
- Reads and updates `AI NetLink Interface/ai-net-link/public/version.json`.
- Publishes the latest project changes to `GitHub main`.
- Stores GitHub settings locally in `%APPDATA%\NetLinkPublisher\publisher-config.json`.
- Includes a cleaner dark UI with Arabic and English language support.

## How To Use

1. Open `Launch NetLink Publisher.cmd`.
2. Choose the project folder if needed.
3. Fill:
   - GitHub repo URL
   - GitHub username
   - GitHub token
   - version number
   - build date
   - changelog
4. Click `نشر إلى GitHub`.

## Notes

- This tool is separate from the online system.
- The online system should only check for updates and install updates.
- The publish token is stored locally on Windows, not inside the project repository.
