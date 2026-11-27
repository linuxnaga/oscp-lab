import type { ChainHost, Difficulty, Domain, Lab, OS, PortService } from "@/types/oscp";
import { XP_REWARDS } from "@/lib/gamification";

/*
 * OSCP Lab Curriculum
 * -------------------
 * 20 handcrafted flagship labs plus a deterministic generator that fills the
 * curriculum to exactly 200 labs (LAB-001 .. LAB-200) across six domains.
 *
 * Lab content is written as study notes: the vulnerability class, how to
 * recognise it during enumeration, the methodology to follow, the tooling
 * involved, and how it would be remediated. It deliberately stops short of
 * copy-paste exploit payloads; practise the hands-on steps in your own
 * authorised lab environment (OffSec PG, HTB, your own VMs).
 */

// ---------------------------------------------------------------------------
// Deterministic helpers
// ---------------------------------------------------------------------------

/** FNV-1a 32-bit hash: stable across runtimes, used for flags and variation. */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function hex32(input: string): string {
  // Four chained hashes -> 32 hex chars, mirroring the real OffSec flag format.
  let out = "";
  for (let i = 0; i < 4; i++) out += hash(`${input}:${i}`).toString(16).padStart(8, "0");
  return out;
}

function flagsFor(id: string): Lab["flags"] {
  return { local: hex32(`${id}:local`), proof: hex32(`${id}:proof`) };
}

function pick<T>(pool: readonly T[], seed: number): T {
  return pool[seed % pool.length];
}

const p = (port: number, service: string, version: string, proto: "tcp" | "udp" = "tcp"): PortService => ({
  port,
  proto,
  service,
  version,
});

// ---------------------------------------------------------------------------
// Shared pools
// ---------------------------------------------------------------------------

const ADJECTIVES = [
  "silent", "crimson", "frozen", "hollow", "iron", "lunar", "obsidian", "phantom",
  "rusty", "shadow", "solar", "static", "toxic", "velvet", "wired",
] as const;

const NOUNS = [
  "anvil", "beacon", "cipher", "drift", "ember", "falcon", "glacier", "harbor",
  "lantern", "monolith", "nexus", "orchid", "prism", "quarry", "raven",
] as const;

/** 225 unique codenames via a bijective permutation of the adjective x noun grid. */
function codename(index: number): string {
  const k = (index * 97 + 13) % 225;
  return `${ADJECTIVES[k % 15]}-${NOUNS[Math.floor(k / 15)]}`;
}

const WEB_STACKS: { label: string; ports: PortService[] }[] = [
  { label: "Apache / PHP", ports: [p(22, "ssh", "OpenSSH 8.9p1 Ubuntu"), p(80, "http", "Apache httpd 2.4.52")] },
  { label: "nginx / Python", ports: [p(22, "ssh", "OpenSSH 9.2p1 Debian"), p(80, "http", "nginx 1.22.1"), p(5000, "http", "Werkzeug 2.2.2 (Python 3.11)")] },
  { label: "Node.js / Express", ports: [p(22, "ssh", "OpenSSH 8.4p1 Debian"), p(3000, "http", "Node.js Express framework")] },
  { label: "Tomcat / Java", ports: [p(22, "ssh", "OpenSSH 8.2p1 Ubuntu"), p(8080, "http", "Apache Tomcat 9.0.65")] },
  { label: "IIS / ASP.NET", ports: [p(80, "http", "Microsoft IIS httpd 10.0"), p(135, "msrpc", "Microsoft Windows RPC"), p(445, "microsoft-ds", "SMB")] },
  { label: "nginx / PHP-FPM", ports: [p(22, "ssh", "OpenSSH 8.9p1 Ubuntu"), p(80, "http", "nginx 1.18.0"), p(3306, "mysql", "MySQL 8.0.33")] },
];

const LINUX_BASE: PortService[] = [p(22, "ssh", "OpenSSH 8.9p1 Ubuntu 3ubuntu0.4"), p(80, "http", "Apache httpd 2.4.52")];
const WINDOWS_BASE: PortService[] = [
  p(135, "msrpc", "Microsoft Windows RPC"),
  p(139, "netbios-ssn", "Microsoft Windows netbios-ssn"),
  p(445, "microsoft-ds", "Windows Server 2019 SMB"),
  p(5985, "http", "Microsoft HTTPAPI 2.0 (WinRM)"),
];
const DC_BASE: PortService[] = [
  p(53, "domain", "Simple DNS Plus"),
  p(88, "kerberos-sec", "Microsoft Windows Kerberos"),
  p(135, "msrpc", "Microsoft Windows RPC"),
  p(389, "ldap", "Microsoft AD LDAP (Domain: CORP.LOCAL)"),
  p(445, "microsoft-ds", "SMB (signing required)"),
  p(636, "ldapssl", "Microsoft AD LDAPS"),
  p(5985, "http", "Microsoft HTTPAPI 2.0 (WinRM)"),
];

const AD_DOMAINS = ["corp.local", "megabank.local", "oscorp.htb", "nexus.lab", "hollow.int", "medtech.local", "relia.com", "skylark.local"] as const;

// ---------------------------------------------------------------------------
// 20 flagship labs (handcrafted)
// ---------------------------------------------------------------------------

type Draft = Omit<Lab, "id" | "ip" | "xp" | "flags" | "flagship">;

const FLAGSHIPS: Draft[] = [
  // ---- Web Exploitation (4) ----
  {
    name: "inkwell",
    os: "Linux",
    difficulty: "Easy",
    domain: "Web Exploitation",
    tags: ["SQL Injection", "Credential Reuse", "Sudo"],
    cves: [],
    tools: ["nmap", "feroxbuster", "Burp Suite", "sqlmap"],
    summary: "A small publishing CMS whose article search concatenates user input into a MySQL query.",
    ports: [p(22, "ssh", "OpenSSH 8.9p1 Ubuntu"), p(80, "http", "Apache httpd 2.4.52 (InkWell CMS)"), p(3306, "mysql", "MySQL 8.0.33 (filtered)")],
    foothold: {
      vector: "Union-based SQL injection in the search parameter",
      details:
        "The search endpoint returns a database error when a single quote is supplied, and result counts change with boolean conditions. The users table holds bcrypt hashes; one weak password is crackable and reused for SSH.",
      steps: [
        "Fingerprint the web stack and brute-force content to find the search and admin endpoints.",
        "Proxy the search request through Burp and confirm injection with error-based and boolean tests.",
        "Determine column count and DBMS, then enumerate schema and the users table.",
        "Crack the recovered hash offline and test the password against SSH (credential reuse).",
      ],
    },
    privesc: {
      vector: "Sudo rule on a GTFOBins-listed binary",
      details: "The web user can run a text pager as root via sudo without a password; pagers that can spawn a shell break out of the restricted context.",
      tooling: ["sudo -l", "GTFOBins"],
      steps: ["Review sudo rights immediately after landing.", "Cross-reference the allowed binary on GTFOBins for the 'Sudo' technique."],
    },
    remediation: "Use parameterised queries, enforce unique passwords, and remove interactive binaries from sudoers.",
    hint: "Check what the search box does with a lone apostrophe.",
  },
  {
    name: "mirrorball",
    os: "Linux",
    difficulty: "Medium",
    domain: "Web Exploitation",
    tags: ["SSTI", "Jinja2", "Capabilities"],
    cves: [],
    tools: ["nmap", "ffuf", "Burp Suite", "linpeas"],
    summary: "A Flask greeting-card generator renders user-supplied names directly through Jinja2.",
    ports: [p(22, "ssh", "OpenSSH 9.2p1 Debian"), p(5000, "http", "Werkzeug 2.2.2 (Python 3.11.2)")],
    foothold: {
      vector: "Server-Side Template Injection (Jinja2)",
      details:
        "Template expressions in the card name field are evaluated server-side (arithmetic expressions return computed results). Jinja2 object traversal leads to code execution as the app user.",
      steps: [
        "Identify reflected input in the preview and probe with template-syntax polyglots.",
        "Use the response to fingerprint the engine (Jinja2 vs. Twig vs. others).",
        "Research the engine's sandbox-escape primitives and achieve command execution in your lab.",
      ],
    },
    privesc: {
      vector: "cap_setuid on a Python interpreter",
      details: "A copy of python3 has the cap_setuid+ep capability, letting the process change its UID to 0.",
      tooling: ["getcap -r / 2>/dev/null", "linpeas", "GTFOBins"],
      steps: ["Enumerate file capabilities recursively.", "Look up the interpreter's 'Capabilities' entry on GTFOBins."],
    },
    remediation: "Never render untrusted input as a template; strip unnecessary capabilities from interpreters.",
    hint: "What does the preview print if your name is a maths expression in double braces?",
  },
  {
    name: "parcelpost",
    os: "Linux",
    difficulty: "Medium",
    domain: "Web Exploitation",
    tags: ["File Upload", "Extension Bypass", "Cron"],
    cves: [],
    tools: ["nmap", "gobuster", "Burp Suite", "pspy"],
    summary: "A shipping-label portal accepts image uploads but only validates the Content-Type header.",
    ports: [p(22, "ssh", "OpenSSH 8.2p1 Ubuntu"), p(80, "http", "Apache httpd 2.4.41 (PHP 7.4)")],
    foothold: {
      vector: "Unrestricted file upload with client-controlled MIME validation",
      details:
        "The upload handler trusts the Content-Type header and stores files in a web-accessible /uploads directory with their original extension, so server-side scripts are executed.",
      steps: [
        "Locate the upload storage path via directory brute-forcing.",
        "Intercept an upload and test which checks are enforced (MIME, extension, magic bytes).",
        "Upload a benign server-side script to prove execution, then escalate to a shell in your lab.",
      ],
    },
    privesc: {
      vector: "Root cron job executing a world-writable script",
      details: "pspy reveals a backup script running every minute as root; the script file itself is writable by www-data.",
      tooling: ["pspy64", "ls -la /opt/scripts"],
      steps: ["Monitor processes for scheduled tasks.", "Check write permissions on every script root executes."],
    },
    remediation: "Validate uploads server-side by content, store them outside the web root, and lock down scheduled script permissions.",
    hint: "The server believes whatever Content-Type you tell it.",
  },
  {
    name: "ledgerline",
    os: "Windows",
    difficulty: "Hard",
    domain: "Web Exploitation",
    tags: ["Deserialization", ".NET ViewState", "SeImpersonate"],
    cves: [],
    tools: ["nmap", "Burp Suite", "ysoserial.net", "GodPotato"],
    summary: "An ASP.NET invoicing app leaks its machineKey through an exposed backup of web.config.",
    ports: [p(80, "http", "Microsoft IIS httpd 10.0 (ASP.NET 4.8)"), p(135, "msrpc", "Microsoft Windows RPC"), p(445, "microsoft-ds", "SMB"), p(5985, "http", "WinRM")],
    foothold: {
      vector: ".NET ViewState deserialization with a leaked machineKey",
      details:
        "A web.config.bak file in the web root discloses validationKey and decryptionKey. With those keys a signed ViewState can be forged, and the server deserializes it into code execution as the IIS AppPool identity.",
      steps: [
        "Brute-force for backup and config files (.bak, .old, ~).",
        "Extract the machineKey values and the target page's generator parameters.",
        "Study how ysoserial.net builds a signed ViewState gadget chain and reproduce it in your lab.",
      ],
    },
    privesc: {
      vector: "SeImpersonatePrivilege → Potato attack",
      details: "IIS AppPool identities hold SeImpersonatePrivilege; a Potato-family exploit coerces a SYSTEM token and impersonates it.",
      tooling: ["whoami /priv", "GodPotato", "PrintSpoofer"],
      steps: ["Check token privileges after landing.", "Select the Potato variant that matches the OS build."],
    },
    remediation: "Never ship config backups, rotate machineKeys, and run app pools with least privilege.",
    hint: "Developers love leaving .bak files next to the real config.",
  },

  // ---- Linux PrivEsc (4) ----
  {
    name: "tarpit",
    os: "Linux",
    difficulty: "Easy",
    domain: "Linux PrivEsc",
    tags: ["Cron", "Tar Wildcard Injection", "Anonymous FTP"],
    cves: [],
    tools: ["nmap", "ftp", "pspy", "linpeas"],
    summary: "Anonymous FTP exposes SSH credentials in a notes file; a root cron archives a directory with tar *.",
    ports: [p(21, "ftp", "vsftpd 3.0.5 (anonymous allowed)"), p(22, "ssh", "OpenSSH 8.9p1 Ubuntu")],
    foothold: {
      vector: "Credentials in anonymous FTP share",
      details: "A todo.txt left on the anonymous FTP share contains a temporary SSH password for the backup user.",
      steps: ["Check every FTP service for anonymous login.", "Recursively download and read everything you can."],
    },
    privesc: {
      vector: "Wildcard injection in a root tar cron job",
      details:
        "Root runs `tar czf` with a `*` glob inside a directory the user can write to. Filenames that begin with dashes are parsed as tar options, which can be abused to run a command.",
      tooling: ["pspy64", "cat /etc/crontab"],
      steps: [
        "Find the cron entry and the directory it archives.",
        "Understand why shell globs expand filenames into arguments.",
        "Research tar's checkpoint options and how they lead to execution.",
      ],
    },
    remediation: "Prefix globs with ./ (or use --) in scripts, and never archive user-writable directories as root.",
    hint: "When a filename looks like a flag, the program can't tell the difference.",
  },
  {
    name: "sharedrive",
    os: "Linux",
    difficulty: "Medium",
    domain: "Linux PrivEsc",
    tags: ["NFS", "no_root_squash", "SUID"],
    cves: [],
    tools: ["nmap", "showmount", "linpeas"],
    summary: "An NFS export intended for home directories is shared with no_root_squash.",
    ports: [p(22, "ssh", "OpenSSH 8.4p1 Debian"), p(111, "rpcbind", "2-4 (RPC #100000)"), p(2049, "nfs", "3-4 (RPC #100003)")],
    foothold: {
      vector: "Readable home directory over NFS",
      details: "The export contains a user's .ssh directory; the authorised private key is readable once the share is mounted.",
      steps: ["List exports with showmount.", "Mount the share on your attack box and inspect permissions and dotfiles."],
    },
    privesc: {
      vector: "no_root_squash allows root-owned SUID files from the client",
      details:
        "Because root on the client is not squashed to nobody, files created as root on the mount stay root-owned on the server, including the SUID bit.",
      tooling: ["cat /etc/exports", "linpeas"],
      steps: ["Read /etc/exports on the target to confirm the option.", "Reason about what a root-owned SUID binary on the share would allow."],
    },
    remediation: "Always use root_squash (the default) and restrict exports by host.",
    hint: "Read /etc/exports from the inside.",
  },
  {
    name: "dockhand",
    os: "Linux",
    difficulty: "Medium",
    domain: "Linux PrivEsc",
    tags: ["Docker Group", "Container Escape", "Git Leak"],
    cves: [],
    tools: ["nmap", "git-dumper", "linpeas"],
    summary: "An exposed .git directory leaks deployment credentials; the deploy user is in the docker group.",
    ports: [p(22, "ssh", "OpenSSH 8.9p1 Ubuntu"), p(80, "http", "nginx 1.18.0")],
    foothold: {
      vector: "Exposed .git repository",
      details: "/.git/ is browsable; reconstructing history reveals a removed .env with the deploy user's SSH password.",
      steps: ["Check for /.git/HEAD on every web root.", "Dump the repo and review the full commit history, not just HEAD."],
    },
    privesc: {
      vector: "Membership of the docker group",
      details: "The docker group can start containers with arbitrary host mounts, which is equivalent to root on the host.",
      tooling: ["id", "docker images", "GTFOBins"],
      steps: ["Check group memberships with id.", "Understand why bind-mounting / into a container breaks isolation."],
    },
    remediation: "Block access to VCS metadata and treat docker group membership as root.",
    hint: "git log remembers what HEAD forgot.",
  },
  {
    name: "polkadot",
    os: "Linux",
    difficulty: "Hard",
    domain: "Linux PrivEsc",
    tags: ["PwnKit", "Polkit", "Kernel/Local Exploit"],
    cves: ["CVE-2021-4034"],
    tools: ["nmap", "linpeas", "searchsploit"],
    summary: "A legacy monitoring box with an unpatched polkit package and a vulnerable Grafana instance.",
    ports: [p(22, "ssh", "OpenSSH 7.6p1 Ubuntu"), p(3000, "http", "Grafana 8.3.0")],
    foothold: {
      vector: "Grafana 8.x plugin path traversal (CVE-2021-43798)",
      details: "The unauthenticated plugin asset route allows directory traversal, exposing grafana.ini and the SQLite database with a reusable admin password.",
      steps: ["Version-fingerprint Grafana from the login page.", "Research the public advisory and read configuration files to recover credentials."],
    },
    privesc: {
      vector: "PwnKit: pkexec local privilege escalation (CVE-2021-4034)",
      details: "pkexec mishandles an empty argv, letting an attacker influence environment variables and load attacker-controlled code as root.",
      tooling: ["linpeas", "dpkg -l policykit-1", "searchsploit"],
      steps: ["Let linpeas flag vulnerable package versions.", "Read the Qualys advisory to understand the root cause before using a public PoC."],
    },
    remediation: "Patch Grafana and polkit; remove the SUID bit from pkexec where it is not required.",
    hint: "Two CVEs, both from late 2021.",
  },

  // ---- Windows PrivEsc (4) ----
  {
    name: "pathfinder",
    os: "Windows",
    difficulty: "Easy",
    domain: "Windows PrivEsc",
    tags: ["Unquoted Service Path", "SMB Null Session"],
    cves: [],
    tools: ["nmap", "nxc", "winPEAS", "PowerUp"],
    summary: "A print-management service installed under 'C:\\Program Files\\Print Manager\\bin\\svc.exe' without quotes.",
    ports: [...WINDOWS_BASE, p(3389, "ms-wbt-server", "Microsoft Terminal Services")],
    foothold: {
      vector: "Credentials in a readable SMB share",
      details: "A guest-readable 'IT' share contains a deployment script with a hard-coded local user password, valid for WinRM.",
      steps: ["Enumerate shares with null and guest sessions.", "Spider readable shares for scripts and config files.", "Validate credentials against WinRM and RDP."],
    },
    privesc: {
      vector: "Unquoted service path with a writable intermediate directory",
      details:
        "Windows tries each space-separated prefix of an unquoted path as an executable. 'C:\\Program Files\\Print Manager' is writable by Users, so a binary named 'Print.exe' would be launched by the SYSTEM service on restart.",
      tooling: ["winPEAS", "PowerUp Get-UnquotedService", "icacls", "sc qc"],
      steps: ["List services with unquoted paths containing spaces.", "Check ACLs on each intermediate directory.", "Confirm you can restart the service or that it starts on boot."],
    },
    remediation: "Quote service ImagePaths and remove write permission for Users on Program Files subfolders.",
    hint: "Count the spaces in the service path.",
  },
  {
    name: "tokenring",
    os: "Windows",
    difficulty: "Medium",
    domain: "Windows PrivEsc",
    tags: ["MSSQL", "xp_cmdshell", "SeImpersonate", "GodPotato"],
    cves: [],
    tools: ["nmap", "impacket-mssqlclient", "GodPotato"],
    summary: "An MSSQL instance with a weak sa password; the service account holds SeImpersonatePrivilege.",
    ports: [...WINDOWS_BASE, p(1433, "ms-sql-s", "Microsoft SQL Server 2019 15.00.2000")],
    foothold: {
      vector: "Weak MSSQL credentials → xp_cmdshell",
      details: "The sa account uses a vendor default. sysadmin role members can enable xp_cmdshell and run OS commands as the SQL service account.",
      steps: ["Test common/default credentials on MSSQL.", "Check your role and whether xp_cmdshell can be enabled.", "Run whoami to confirm the service identity."],
    },
    privesc: {
      vector: "SeImpersonatePrivilege via GodPotato",
      details: "Service accounts typically hold SeImpersonatePrivilege; GodPotato abuses DCOM/RPCSS to obtain and impersonate a SYSTEM token on Windows Server 2012–2022.",
      tooling: ["whoami /priv", "GodPotato", "PrintSpoofer"],
      steps: ["Inspect token privileges.", "Match the Potato variant to the OS build and available services."],
    },
    remediation: "Rotate default credentials, disable xp_cmdshell, and run SQL Server as a low-privilege virtual account.",
    hint: "Service accounts and impersonation tokens go hand in hand.",
  },
  {
    name: "msiexec",
    os: "Windows",
    difficulty: "Medium",
    domain: "Windows PrivEsc",
    tags: ["AlwaysInstallElevated", "Phishing Macro", "Registry"],
    cves: [],
    tools: ["nmap", "winPEAS", "msfvenom", "reg query"],
    summary: "A workstation policy grants AlwaysInstallElevated in both HKLM and HKCU.",
    ports: [...WINDOWS_BASE, p(80, "http", "Microsoft IIS httpd 10.0"), p(25, "smtp", "hMailServer smtpd")],
    foothold: {
      vector: "Client-side attack via document upload",
      details: "The HR portal invites CV uploads that a scripted 'recruiter' opens; this simulates the client-side attack chain taught in PEN-200.",
      steps: ["Read the portal's instructions carefully for who opens files.", "Review PEN-200's client-side attack module for the delivery workflow."],
    },
    privesc: {
      vector: "AlwaysInstallElevated policy",
      details: "When both HKLM and HKCU AlwaysInstallElevated values are 1, any user can install .msi packages with SYSTEM privileges.",
      tooling: ["reg query HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer", "winPEAS", "PowerUp"],
      steps: ["Query both registry hives; both must be set.", "Understand how msiexec runs custom actions as SYSTEM."],
    },
    remediation: "Disable AlwaysInstallElevated in Group Policy for both user and computer configuration.",
    hint: "Two registry keys, both set to 1.",
  },
  {
    name: "vaultkeeper",
    os: "Windows",
    difficulty: "Hard",
    domain: "Windows PrivEsc",
    tags: ["DPAPI", "Credential Manager", "Saved Credentials"],
    cves: [],
    tools: ["nmap", "winPEAS", "mimikatz", "SharpDPAPI"],
    summary: "A jump host where an admin's RDP credentials are saved in Credential Manager.",
    ports: [...WINDOWS_BASE, p(3389, "ms-wbt-server", "Microsoft Terminal Services"), p(8443, "https-alt", "Jenkins 2.346")],
    foothold: {
      vector: "Jenkins Script Console with reused credentials",
      details: "Jenkins accepts a password found in a public GitHub-style repo mirror; the Groovy Script Console allows command execution as the service user.",
      steps: ["Fingerprint Jenkins and test credential reuse.", "Understand why the Script Console equals code execution."],
    },
    privesc: {
      vector: "DPAPI-protected saved credentials",
      details: "cmdkey /list shows a stored credential for the local Administrator. DPAPI blobs can be decrypted with the user's masterkey, which is derivable from their password.",
      tooling: ["cmdkey /list", "SharpDPAPI", "mimikatz dpapi::"],
      steps: ["List stored credentials.", "Locate credential blobs and masterkeys under the user profile.", "Study how DPAPI masterkeys are protected by the user's password."],
    },
    remediation: "Avoid saving privileged credentials on shared hosts; use LAPS and Credential Guard.",
    hint: "cmdkey knows something you don't.",
  },

  // ---- Active Directory (4) ----
  {
    name: "roastbeef",
    os: "Active Directory",
    difficulty: "Easy",
    domain: "Active Directory",
    tags: ["AS-REP Roasting", "Kerberos", "User Enumeration"],
    cves: [],
    tools: ["kerbrute", "impacket-GetNPUsers", "hashcat", "nxc"],
    summary: "A domain user has 'Do not require Kerberos preauthentication' enabled.",
    ports: [...DC_BASE],
    foothold: {
      vector: "AS-REP Roasting",
      details: "Accounts without pre-auth return an AS-REP encrypted with a key derived from their password, which can be cracked offline (hashcat mode 18200).",
      steps: ["Build a username list from the website staff page and validate it with kerbrute.", "Request AS-REPs for users without pre-auth.", "Crack offline with a wordlist."],
    },
    privesc: {
      vector: "Account Operators → privileged group membership",
      details: "The cracked user is in Account Operators, which can manage most non-protected groups and accounts.",
      tooling: ["bloodhound-ce", "net group /domain"],
      steps: ["Map group memberships in BloodHound.", "Identify which groups Account Operators can modify."],
    },
    remediation: "Enforce Kerberos pre-auth on all accounts and audit built-in operator groups.",
    hint: "Some users skip the pre-authentication step.",
  },
  {
    name: "ticketmaster",
    os: "Active Directory",
    difficulty: "Medium",
    domain: "Active Directory",
    tags: ["Kerberoasting", "SPN", "MSSQL Service Account"],
    cves: [],
    tools: ["impacket-GetUserSPNs", "hashcat", "rubeus", "nxc"],
    summary: "A SQL service account with an SPN and a weak, never-rotated password.",
    ports: [...DC_BASE, p(1433, "ms-sql-s", "Microsoft SQL Server 2019")],
    foothold: {
      vector: "Kerberoasting with a low-privilege domain user",
      details: "Any authenticated user can request a TGS for accounts with SPNs; the ticket is encrypted with the service account's password hash (hashcat 13100).",
      steps: ["Start from the provided low-privilege credentials.", "Enumerate user accounts with SPNs.", "Request service tickets and crack offline."],
    },
    privesc: {
      vector: "Service account is a local admin on the DC (misconfiguration)",
      details: "The SQL service account was added to the DC's local Administrators for 'troubleshooting', giving full control.",
      tooling: ["nxc smb", "impacket-secretsdump"],
      steps: ["Test the cracked credentials across hosts with nxc.", "Look for (Pwn3d!) indicators of admin access."],
    },
    remediation: "Use gMSAs for services, long random passwords, and AES-only Kerberos encryption.",
    hint: "Any domain user can ask for a service ticket.",
  },
  {
    name: "aclgraph",
    os: "Active Directory",
    difficulty: "Hard",
    domain: "Active Directory",
    tags: ["BloodHound", "GenericAll", "WriteDacl", "DCSync"],
    cves: [],
    tools: ["bloodhound-ce", "bloodhound-python", "PowerView", "impacket-secretsdump"],
    summary: "An ACL attack path: helpdesk → GenericAll on a group → WriteDacl on the domain object.",
    ports: [...DC_BASE],
    foothold: {
      vector: "Password spraying a seasonal password",
      details: "The lockout threshold is 5; one careful spray of a 'Season+Year' style password hits a helpdesk account.",
      steps: ["Read the password policy first (lockout threshold and window).", "Spray one password at a time across the user list, well under the threshold."],
    },
    privesc: {
      vector: "ACL chain to DCSync",
      details:
        "BloodHound shows helpdesk has GenericAll over 'IT Admins', and 'IT Admins' has WriteDacl on the domain. WriteDacl can grant replication rights (DS-Replication-Get-Changes[-All]), enabling DCSync.",
      tooling: ["bloodhound-ce", "PowerView", "impacket-dacledit", "impacket-secretsdump"],
      steps: ["Collect with bloodhound-python and mark your user as owned.", "Run 'Shortest path to Domain Admins' and read each edge's help text.", "Understand which rights DCSync requires."],
    },
    remediation: "Audit and prune ACLs with BloodHound regularly; alert on replication requests from non-DC hosts.",
    hint: "Follow the edges. BloodHound's help panel explains each one.",
  },
  {
    name: "certifried",
    os: "Active Directory",
    difficulty: "Hard",
    domain: "Active Directory",
    tags: ["ADCS", "ESC1", "Certificate Templates", "Pass-the-Certificate"],
    cves: [],
    tools: ["certipy-ad", "nxc", "bloodhound-ce"],
    summary: "An AD CS template lets enrollees supply their own Subject Alternative Name.",
    ports: [...DC_BASE, p(80, "http", "Microsoft IIS httpd 10.0 (certsrv)")],
    foothold: {
      vector: "Low-privileged credentials from an SMB share",
      details: "A readable 'Onboarding' share contains a welcome PDF with the default new-starter password; one account never changed it.",
      steps: ["Spider shares as guest.", "Test the default password against all enumerated users (respecting lockout)."],
    },
    privesc: {
      vector: "ADCS ESC1: enrollee-supplied SAN on a client-auth template",
      details:
        "The template allows Domain Users to enroll, has Client Authentication EKU, requires no manager approval and sets ENROLLEE_SUPPLIES_SUBJECT. A certificate requested for another user can be used for Kerberos PKINIT authentication as them.",
      tooling: ["certipy-ad find", "certipy-ad req", "certipy-ad auth"],
      steps: ["Enumerate templates and let certipy flag vulnerable ones.", "Read SpecterOps' 'Certified Pre-Owned' ESC1 section to understand each condition."],
    },
    remediation: "Remove ENROLLEE_SUPPLIES_SUBJECT from auth templates, require manager approval, and restrict enrollment rights.",
    hint: "Who gets to decide whose name goes on the certificate?",
  },

  // ---- Pivoting & Tunneling (2) ----
  {
    name: "deepwell",
    os: "Linux",
    difficulty: "Medium",
    domain: "Pivoting & Tunneling",
    tags: ["Ligolo-ng", "Dual-homed Host", "Internal Web App"],
    cves: [],
    tools: ["ligolo-ng", "nmap", "nxc"],
    summary: "A dual-homed Linux web server bridges the DMZ (10.10.11.0/24) and an internal 172.16.20.0/24 subnet.",
    ports: [p(22, "ssh", "OpenSSH 8.9p1 Ubuntu"), p(80, "http", "nginx 1.18.0")],
    foothold: {
      vector: "Command injection in a network diagnostics page",
      details: "A 'ping tester' page passes the host field to a shell; the box's second interface reveals the internal subnet.",
      steps: ["Test input fields that obviously call OS utilities.", "After landing, run ip a / ip route to discover additional networks."],
    },
    privesc: {
      vector: "Pivot with Ligolo-ng to reach an internal admin panel",
      details:
        "Ligolo-ng creates a TUN interface on the attacker box so internal hosts are routable without proxychains. The internal panel at 172.16.20.15 reuses the web server's DB password.",
      tooling: ["ligolo-ng proxy/agent", "ip route", "nmap"],
      steps: ["Set up the proxy on Kali and run the agent from the foothold.", "Add a route for the internal subnet to the ligolo interface.", "Re-run enumeration against the internal range."],
    },
    remediation: "Segment networks with firewalls, not just routing, and avoid dual-homed DMZ hosts.",
    hint: "ip a shows more than one network.",
    chain: [
      { role: "Pivot", hostname: "deepwell", ip: "10.10.11.0/24 ↔ 172.16.20.5", os: "Ubuntu 22.04", summary: "Foothold and Ligolo-ng agent." },
      { role: "Internal", hostname: "intranet-adm", ip: "172.16.20.15", os: "Debian 12", summary: "Internal admin panel; credential reuse." },
    ],
  },
  {
    name: "doublehop",
    os: "Windows",
    difficulty: "Hard",
    domain: "Pivoting & Tunneling",
    tags: ["Double Pivot", "Chisel", "SOCKS", "SSH Dynamic Forward"],
    cves: [],
    tools: ["chisel", "ssh -D", "proxychains", "nxc"],
    summary: "Reach a third network segment by chaining an SSH dynamic forward and a Chisel reverse SOCKS tunnel.",
    ports: [p(22, "ssh", "OpenSSH 8.4p1 Debian"), p(8080, "http", "Jetty 9.4 (Jenkins)")],
    foothold: {
      vector: "Jenkins on the first hop with no authentication",
      details: "An unauthenticated Jenkins on hop 1 provides a foothold; SSH keys on that host open hop 2 on a second subnet.",
      steps: ["Enumerate all reachable services on hop 1.", "Hunt for SSH keys and known_hosts entries to map onward routes."],
    },
    privesc: {
      vector: "Chained tunnels to a Windows file server on segment 3",
      details: "Hop 2 is Windows with no SSH, so a Chisel reverse SOCKS server is used through the first tunnel to reach 10.20.30.0/24.",
      tooling: ["ssh -D", "chisel server/client", "proxychains4.conf"],
      steps: ["Draw the network map before building tunnels.", "Understand local vs. remote vs. dynamic forwarding.", "Chain proxies carefully and test each hop."],
    },
    remediation: "Restrict egress between segments and monitor for long-lived tunnelling processes.",
    hint: "Draw the network map on paper first.",
    chain: [
      { role: "Pivot", hostname: "hop-one", ip: "10.10.11.0/24 ↔ 192.168.50.10", os: "Debian 11", summary: "Jenkins foothold; SSH keys to hop 2." },
      { role: "Pivot", hostname: "hop-two", ip: "192.168.50.20 ↔ 10.20.30.4", os: "Windows Server 2019", summary: "Chisel client for reverse SOCKS." },
      { role: "Internal", hostname: "files01", ip: "10.20.30.12", os: "Windows Server 2022", summary: "Target file server on segment 3." },
    ],
  },

  // ---- Exam Chains (2) ----
  {
    name: "medtech-set",
    os: "Active Directory",
    difficulty: "Hard",
    domain: "Exam Chains",
    tags: ["Exam Simulation", "Standalone + Client + DC", "Kerberoasting", "Pivoting"],
    cves: [],
    tools: ["nmap", "nxc", "ligolo-ng", "bloodhound-ce", "impacket-*"],
    summary: "A full exam-style AD set: an internet-facing standalone, a domain-joined client, and a DC behind it.",
    ports: [p(80, "http", "Microsoft IIS 10.0 (patient portal)"), p(445, "microsoft-ds", "SMB"), p(5985, "http", "WinRM")],
    foothold: {
      vector: "Patient portal SQL injection on the standalone web server",
      details: "The externally reachable host runs a portal vulnerable to stacked-query SQLi against MSSQL, yielding execution as the SQL service account.",
      steps: ["Enumerate the external host thoroughly; it is the only entry point.", "Escalate locally before pivoting so you can dump cached credentials."],
    },
    privesc: {
      vector: "Credential harvest → pivot → Kerberoast → DC",
      details: "Cached domain creds on the client lead to a Kerberoastable service account that is a member of a group with admin rights on the DC.",
      tooling: ["mimikatz", "ligolo-ng", "impacket-GetUserSPNs", "bloodhound-ce"],
      steps: ["Dump credentials on every host you own.", "Pivot into the internal network and re-enumerate.", "Use BloodHound to find the path from your owned users to the DC."],
    },
    remediation: "Patch web apps, use LAPS, tier admin accounts, and use gMSAs for services.",
    hint: "Every owned host is a credential source. Loot before you move.",
    chain: [
      { role: "Standalone", hostname: "WEB01", ip: "192.168.120.10", os: "Windows Server 2019", summary: "Internet-facing IIS + MSSQL." },
      { role: "Client", hostname: "CLIENT02", ip: "172.16.120.21", os: "Windows 11", summary: "Domain-joined workstation with cached creds." },
      { role: "Domain Controller", hostname: "DC01", ip: "172.16.120.5", os: "Windows Server 2022", summary: "medtech.local DC." },
    ],
  },
  {
    name: "relia-set",
    os: "Active Directory",
    difficulty: "Hard",
    domain: "Exam Chains",
    tags: ["Exam Simulation", "ADCS ESC1", "Linux Standalone", "Ligolo-ng"],
    cves: [],
    tools: ["nmap", "ligolo-ng", "certipy-ad", "linpeas", "nxc"],
    summary: "A Linux standalone that leaks domain creds, a Windows client, and a DC with a misconfigured certificate template.",
    ports: [p(22, "ssh", "OpenSSH 8.9p1 Ubuntu"), p(80, "http", "Apache 2.4.52 (WordPress 6.1)")],
    foothold: {
      vector: "Vulnerable WordPress plugin on the Linux standalone",
      details: "wpscan flags an outdated plugin with a public unauthenticated file-read; wp-config.php discloses DB creds reused for SSH.",
      steps: ["Run wpscan with plugin enumeration.", "Read the advisory for the flagged plugin version."],
    },
    privesc: {
      vector: "Linux sudo misconfig → domain creds in a keytab → ESC1 on the DC",
      details: "Root on the Linux host exposes a Kerberos keytab for a domain service account, which can enroll in a vulnerable ESC1 template.",
      tooling: ["linpeas", "klist", "certipy-ad"],
      steps: ["Look for /etc/krb5.keytab and other domain artefacts on Linux hosts.", "Use certipy to enumerate templates once you have domain creds."],
    },
    remediation: "Keep WordPress plugins patched, protect keytabs, and harden AD CS templates.",
    hint: "Linux boxes joined to AD keep secrets in keytabs.",
    chain: [
      { role: "Standalone", hostname: "WEB-LNX", ip: "192.168.130.14", os: "Ubuntu 22.04", summary: "WordPress; domain-joined via SSSD." },
      { role: "Client", hostname: "WK01", ip: "172.16.130.30", os: "Windows 10", summary: "Workstation reachable after pivot." },
      { role: "Domain Controller", hostname: "DC-RELIA", ip: "172.16.130.6", os: "Windows Server 2022", summary: "relia.com DC + AD CS." },
    ],
  },
];

// ---------------------------------------------------------------------------
// Technique pools for the generator
// ---------------------------------------------------------------------------

interface Technique {
  name: string;
  tags: string[];
  tools: string[];
  cves?: string[];
  base: Difficulty;
  ports?: PortService[];
  foothold: { vector: string; details: string; steps: string[] };
  privesc: { vector: string; details: string; tooling: string[]; steps: string[] };
  remediation: string;
  hint: string;
}

const WEB_TECHNIQUES: Technique[] = [
  {
    name: "Blind SQL Injection", tags: ["SQLi", "Blind", "Time-based"], tools: ["Burp Suite", "sqlmap"], base: "Medium",
    foothold: { vector: "Time-based blind SQL injection", details: "A tracking cookie is used in a query; responses never differ, but conditional delays do.", steps: ["Identify all inputs, including cookies and headers.", "Test for conditional time delays.", "Automate extraction carefully once confirmed."] },
    privesc: { vector: "Database credentials reused by a local user", details: "The application's DB config file holds a password reused for a local account with sudo rights.", tooling: ["linpeas", "grep -ri password /var/www"], steps: ["Search web roots for config files.", "Try every password against every user."] },
    remediation: "Parameterise queries and stop reusing service passwords.", hint: "The response never changes, but the time it takes does.",
  },
  {
    name: "Local File Inclusion", tags: ["LFI", "Log Poisoning", "Path Traversal"], tools: ["ffuf", "Burp Suite"], base: "Easy",
    foothold: { vector: "LFI escalated via log poisoning", details: "A ?page= parameter includes files from disk; access logs are readable by the web user.", steps: ["Fuzz for traversal depth and readable files.", "Check which logs the web user can read.", "Understand how included logs can turn into execution."] },
    privesc: { vector: "Writable /etc/passwd", details: "Misconfigured permissions make /etc/passwd world-writable.", tooling: ["ls -la /etc/passwd", "linpeas"], steps: ["Check permissions on critical files.", "Understand how passwd entries define UID 0."] },
    remediation: "Map includes to an allow-list and fix file permissions.", hint: "Which files can the web server read that you can also write to?",
  },
  {
    name: "Remote File Inclusion", tags: ["RFI", "PHP allow_url_include"], tools: ["Burp Suite", "python3 -m http.server"], base: "Easy",
    foothold: { vector: "Remote File Inclusion", details: "allow_url_include is enabled and a language parameter fetches remote URLs.", steps: ["Test include parameters with a URL to your own listener.", "Watch for inbound HTTP requests to confirm."] },
    privesc: { vector: "SUID binary with a known shell escape", details: "A non-standard SUID binary is listed on GTFOBins.", tooling: ["find / -perm -4000 2>/dev/null", "GTFOBins"], steps: ["List SUID binaries and compare against a default install.", "Look up unusual ones on GTFOBins."] },
    remediation: "Disable allow_url_include and audit SUID binaries.", hint: "Does the server fetch URLs you give it?",
  },
  {
    name: "XML External Entity", tags: ["XXE", "File Read", "SSRF"], tools: ["Burp Suite"], base: "Medium",
    foothold: { vector: "XXE in an XML order import", details: "The parser resolves external entities, allowing local file reads; an SSH private key is readable.", steps: ["Find endpoints that accept XML (including SOAP and SVG uploads).", "Test whether external entities are resolved.", "Prioritise high-value files (keys, configs)."] },
    privesc: { vector: "Sudo on a script with a relative command path", details: "A sudo-allowed script calls a binary without its full path.", tooling: ["sudo -l", "cat the script"], steps: ["Read every script you can run with sudo.", "Check for env_keep or secure_path settings."] },
    remediation: "Disable DTDs/external entities and use absolute paths in privileged scripts.", hint: "The order importer speaks XML.",
  },
  {
    name: "Server-Side Request Forgery", tags: ["SSRF", "Internal Service", "Cloud Metadata"], tools: ["Burp Suite", "ffuf"], base: "Medium",
    ports: [p(22, "ssh", "OpenSSH 8.9p1 Ubuntu"), p(80, "http", "nginx 1.22.1")],
    foothold: { vector: "SSRF to an internal-only admin API", details: "A 'URL preview' feature fetches arbitrary URLs from the server, reaching a localhost-only admin API.", steps: ["Point the feature at your own listener first.", "Fuzz localhost ports through the SSRF.", "Read what the internal service exposes."] },
    privesc: { vector: "Credentials in a root-readable backup exposed via the admin API", details: "The internal API can export backups including a root SSH key.", tooling: ["curl", "ssh -i"], steps: ["Enumerate every endpoint of the internal API.", "Look for export or backup features."] },
    remediation: "Allow-list outbound destinations and authenticate internal APIs.", hint: "What can the server reach that you can't?",
  },
  {
    name: "JWT Algorithm Confusion", tags: ["JWT", "Authentication Bypass", "API"], tools: ["Burp Suite JWT Editor", "jwt_tool"], base: "Medium",
    ports: [p(22, "ssh", "OpenSSH 9.2p1 Debian"), p(3000, "http", "Node.js Express")],
    foothold: { vector: "Weak JWT validation", details: "The API accepts tokens signed with a guessable HMAC secret, so role claims can be modified.", steps: ["Decode the token and review its header and claims.", "Test for 'none' algorithm acceptance and weak secrets offline.", "Find an admin-only feature that leads to code execution."] },
    privesc: { vector: "Node process running as root with a debug port", details: "A root-owned Node service exposes the inspector on localhost.", tooling: ["ss -tlnp", "ps aux"], steps: ["List local listening services.", "Research what the Node inspector allows."] },
    remediation: "Use strong asymmetric keys, pin algorithms, and never run debug ports as root.", hint: "How strong is the signing secret?",
  },
  {
    name: "Insecure Deserialization", tags: ["Deserialization", "Java", "Gadget Chains"], tools: ["Burp Suite", "ysoserial"], base: "Hard",
    foothold: { vector: "Java deserialization in a session cookie", details: "A base64 cookie begins with the Java serialization magic bytes and is deserialized without integrity checks.", steps: ["Recognise serialization signatures (rO0AB, AC ED 00 05).", "Identify which libraries are on the classpath.", "Study how gadget chains turn deserialization into execution."] },
    privesc: { vector: "Tomcat manager credentials → root-run service", details: "tomcat-users.xml reveals manager creds; the Tomcat service runs as root.", tooling: ["cat tomcat-users.xml", "ps aux"], steps: ["Read the Tomcat configuration directory.", "Check which user the service runs as."] },
    remediation: "Never deserialize untrusted data; sign session state; run Tomcat unprivileged.", hint: "That cookie starts with rO0.",
  },
  {
    name: "File Upload Bypass", tags: ["File Upload", "Magic Bytes", ".htaccess"], tools: ["Burp Suite", "exiftool"], base: "Easy",
    foothold: { vector: "Upload filter bypass", details: "The upload filter blocks .php but allows .htaccess, which can remap handlers for other extensions.", steps: ["Map which extensions are blocked vs. allowed.", "Check whether server config files can be uploaded.", "Prove execution with a harmless script first."] },
    privesc: { vector: "PATH hijack in a SUID helper", details: "A custom SUID binary calls a system utility without an absolute path.", tooling: ["strings", "ltrace", "linpeas"], steps: ["Inspect custom binaries with strings.", "Understand how PATH is resolved."] },
    remediation: "Validate uploads by content, block config files, and use absolute paths in SUID code.", hint: "What else can you upload besides scripts?",
  },
  {
    name: "Command Injection", tags: ["OS Command Injection", "Filter Bypass"], tools: ["Burp Suite", "commix"], base: "Easy",
    foothold: { vector: "OS command injection in a network tool", details: "A traceroute form passes the host to a shell with a weak blacklist.", steps: ["Identify features that wrap OS utilities.", "Test for command separators and substitution.", "Learn common blacklist bypasses (whitespace, encoding)."] },
    privesc: { vector: "Writable systemd service unit", details: "A custom .service file is writable by the web user's group.", tooling: ["find /etc/systemd -writable", "systemctl"], steps: ["Search for writable unit files.", "Check whether you can trigger a restart or wait for reboot."] },
    remediation: "Avoid shelling out with user input; fix service file permissions.", hint: "The form just runs a command with your input appended.",
  },
  {
    name: "Known CMS Vulnerability", tags: ["CMS", "Public Exploit", "searchsploit"], tools: ["wpscan", "searchsploit", "droopescan"], base: "Easy",
    cves: ["CVE-2018-7600"],
    foothold: { vector: "Outdated CMS core with a public RCE", details: "The site runs an old CMS core version with a published unauthenticated RCE advisory.", steps: ["Version-fingerprint the CMS from CHANGELOG and meta tags.", "Search for advisories with searchsploit.", "Read public exploit code before running it."] },
    privesc: { vector: "MySQL running as root", details: "The CMS database user is root, and MySQL itself runs as root with FILE privileges.", tooling: ["mysql", "linpeas"], steps: ["Check DB privileges with the recovered creds.", "Research UDF-based escalation."] },
    remediation: "Patch the CMS and run MySQL as an unprivileged user.", hint: "Check the CHANGELOG for a version number.",
  },
];

const LINUX_TECHNIQUES: Technique[] = [
  {
    name: "SUID Binary Abuse", tags: ["SUID", "GTFOBins"], tools: ["find", "GTFOBins", "linpeas"], base: "Easy",
    foothold: { vector: "Default credentials on a web admin panel", details: "A monitoring dashboard uses vendor default credentials and offers a 'run check' feature.", steps: ["Identify the product and search for its defaults.", "Look for features that execute checks or scripts."] },
    privesc: { vector: "SUID on a common binary", details: "An administrator set SUID on a binary with known shell-escape behaviour.", tooling: ["find / -perm -4000 2>/dev/null", "GTFOBins"], steps: ["Compare SUID binaries against a stock install.", "Look up unusual ones on GTFOBins (SUID section)."] },
    remediation: "Audit SUID binaries regularly.", hint: "One SUID binary doesn't belong.",
  },
  {
    name: "Sudoers Misconfiguration", tags: ["Sudo", "LD_PRELOAD", "env_keep"], tools: ["sudo -l", "gcc"], base: "Medium",
    foothold: { vector: "SSH brute force against a named user", details: "The website names a developer; their password appears in a common wordlist.", steps: ["Build a username list from site content.", "Run a rate-limited brute force with hydra."] },
    privesc: { vector: "env_keep+=LD_PRELOAD in sudoers", details: "sudo preserves LD_PRELOAD, so a shared library can be injected into any allowed command.", tooling: ["sudo -l"], steps: ["Read the 'env_keep' lines in sudo -l output.", "Understand what LD_PRELOAD does at process start."] },
    remediation: "Never keep LD_PRELOAD/LD_LIBRARY_PATH in sudo environments.", hint: "Read sudo -l carefully, including the env lines.",
  },
  {
    name: "Cron PATH Hijack", tags: ["Cron", "PATH", "Scheduled Tasks"], tools: ["pspy", "cat /etc/crontab"], base: "Easy",
    foothold: { vector: "Exposed SMB share with SSH key", details: "A Samba share allows guest access and holds a user's id_rsa.", steps: ["Enumerate SMB on Linux too.", "Check file permissions on downloaded keys."] },
    privesc: { vector: "Cron job with a writable directory early in PATH", details: "/etc/crontab sets PATH with a user-writable directory first and calls a command by name.", tooling: ["cat /etc/crontab", "pspy"], steps: ["Read the PATH line in crontab.", "Check write permissions on each directory listed."] },
    remediation: "Use absolute paths in cron and keep PATH limited to root-owned directories.", hint: "Look at the PATH line at the top of /etc/crontab.",
  },
  {
    name: "Linux Capabilities", tags: ["Capabilities", "cap_setuid", "cap_dac_read_search"], tools: ["getcap", "linpeas"], base: "Medium",
    foothold: { vector: "Exposed Redis without auth", details: "Redis is bound to all interfaces without a password, allowing writes to disk locations the redis user owns.", steps: ["Check Redis for unauthenticated access.", "Understand how Redis CONFIG SET dir/dbfilename can write files."] },
    privesc: { vector: "File capability on a binary", details: "A binary has a dangerous capability that bypasses normal permission checks.", tooling: ["getcap -r / 2>/dev/null"], steps: ["Enumerate capabilities recursively.", "Read capabilities(7) for what each one grants."] },
    remediation: "Strip unneeded capabilities and require Redis auth.", hint: "It isn't SUID, but it might as well be.",
  },
  {
    name: "NFS no_root_squash", tags: ["NFS", "no_root_squash"], tools: ["showmount", "mount"], base: "Medium",
    ports: [p(22, "ssh", "OpenSSH 8.4p1 Debian"), p(111, "rpcbind", "2-4"), p(2049, "nfs", "3-4")],
    foothold: { vector: "Readable NFS export with backups", details: "A world-readable export holds a website backup with credentials.", steps: ["List exports.", "Mount and search for credentials."] },
    privesc: { vector: "no_root_squash export", details: "Root on a client keeps root ownership on the share.", tooling: ["cat /etc/exports"], steps: ["Confirm the export options from inside the box.", "Reason about client-side root ownership."] },
    remediation: "Use root_squash and restrict client hosts.", hint: "Squashing is off.",
  },
  {
    name: "LXD Group Escape", tags: ["LXD", "Container", "Group Membership"], tools: ["lxc", "id"], base: "Medium",
    foothold: { vector: "Weak credentials on FTP with write access to web root", details: "FTP credentials from a public note allow writing into the web root.", steps: ["Check FTP for write access.", "Map FTP directories to web paths."] },
    privesc: { vector: "Membership of the lxd group", details: "lxd group members can create privileged containers with the host filesystem mounted.", tooling: ["id", "lxc image list"], steps: ["Check groups with id.", "Understand privileged containers and host mounts."] },
    remediation: "Treat lxd/docker group membership as root-equivalent.", hint: "id shows an interesting group.",
  },
  {
    name: "Kernel / Local Exploit", tags: ["Kernel", "DirtyPipe", "Local Exploit"], tools: ["linpeas", "linux-exploit-suggester", "searchsploit"], base: "Hard",
    cves: ["CVE-2022-0847"],
    foothold: { vector: "Webmin with a public authenticated RCE", details: "An old Webmin version accepts reused credentials and has a published post-auth RCE.", steps: ["Version-fingerprint Webmin.", "Find credentials elsewhere on the box or site."] },
    privesc: { vector: "Dirty Pipe (CVE-2022-0847)", details: "Linux 5.8–5.16.11 allows overwriting read-only page-cache pages via pipe splice, e.g. of SUID binaries or /etc/passwd.", tooling: ["uname -a", "linux-exploit-suggester"], steps: ["Record the exact kernel version.", "Use kernel exploits as a last resort and understand stability risks."] },
    remediation: "Patch kernels promptly.", hint: "uname -r falls inside a famous range.",
  },
  {
    name: "Writable /etc/passwd", tags: ["File Permissions", "passwd"], tools: ["ls -la", "openssl passwd"], base: "Easy",
    foothold: { vector: "Credentials in a public Git repository", details: "The company's open-source repo has a commit adding then removing a config with SSH creds.", steps: ["Find the company's code repos from the website.", "Review commit history for secrets."] },
    privesc: { vector: "World-writable /etc/passwd", details: "A provisioning script set 666 on /etc/passwd.", tooling: ["ls -la /etc/passwd"], steps: ["Check permissions on /etc/passwd and /etc/shadow.", "Understand passwd field structure."] },
    remediation: "Restore 644 on /etc/passwd and audit provisioning scripts.", hint: "Check the permissions of the most famous file in /etc.",
  },
  {
    name: "Python Library Hijack", tags: ["Python", "PYTHONPATH", "Sudo"], tools: ["sudo -l", "python3"], base: "Medium",
    foothold: { vector: "Flask debug console exposed", details: "Werkzeug debug mode is enabled; the console PIN can be derived from readable system files.", steps: ["Check /console on Werkzeug apps.", "Research how the debug PIN is generated."] },
    privesc: { vector: "Sudo Python script importing from a writable path", details: "A sudo-allowed script imports a module from a directory the user can write to.", tooling: ["sudo -l", "python3 -c 'import sys; print(sys.path)'"], steps: ["Read the script's imports.", "Check write access on sys.path directories."] },
    remediation: "Disable debug mode in production and lock down import paths.", hint: "Python checks the script's own directory first.",
  },
  {
    name: "Docker Socket Exposure", tags: ["Docker", "docker.sock", "Container Escape"], tools: ["docker", "curl --unix-socket"], base: "Hard",
    foothold: { vector: "Container foothold via vulnerable web app", details: "Initial access lands inside a container that has /var/run/docker.sock mounted.", steps: ["Recognise you're in a container (/.dockerenv, cgroups).", "Look for mounted sockets."] },
    privesc: { vector: "Mounted Docker socket", details: "Access to the Docker API allows starting a privileged container with the host root mounted.", tooling: ["ls -la /var/run/docker.sock", "curl --unix-socket"], steps: ["Confirm socket access.", "Understand the Docker Engine API."] },
    remediation: "Never mount docker.sock into application containers.", hint: "You're in a container. What did they mount into it?",
  },
];

const WINDOWS_TECHNIQUES: Technique[] = [
  {
    name: "Unquoted Service Path", tags: ["Services", "Unquoted Path"], tools: ["winPEAS", "PowerUp", "icacls"], base: "Easy",
    foothold: { vector: "FTP anonymous access with web root write", details: "Anonymous FTP maps to the IIS web root.", steps: ["Test FTP anonymous write.", "Map FTP paths to IIS paths."] },
    privesc: { vector: "Unquoted service path", details: "A service path with spaces lacks quotes, and an intermediate folder is writable.", tooling: ["wmic service get name,pathname", "icacls"], steps: ["Find unquoted paths.", "Check folder ACLs and restart rights."] },
    remediation: "Quote service paths and fix folder ACLs.", hint: "Spaces in a path without quotes.",
  },
  {
    name: "Weak Service Permissions", tags: ["Services", "Service ACL", "SERVICE_CHANGE_CONFIG"], tools: ["accesschk", "sc", "winPEAS"], base: "Medium",
    foothold: { vector: "Password spraying RDP/WinRM", details: "A user list from SMB null session plus a seasonal password yields WinRM access.", steps: ["Enumerate users via RID cycling.", "Spray respecting lockout policy."] },
    privesc: { vector: "Service with SERVICE_CHANGE_CONFIG for Users", details: "Authenticated Users can reconfigure a SYSTEM service's binary path.", tooling: ["accesschk.exe -uwcqv", "sc qc"], steps: ["Check service DACLs.", "Understand which rights allow reconfiguration."] },
    remediation: "Restrict service DACLs to administrators.", hint: "Who's allowed to change the service config?",
  },
  {
    name: "SeImpersonate Potato", tags: ["SeImpersonatePrivilege", "GodPotato", "PrintSpoofer"], tools: ["GodPotato", "PrintSpoofer", "whoami /priv"], base: "Medium",
    foothold: { vector: "Web shell via vulnerable IIS application", details: "A file manager plugin allows uploads into the web root, giving execution as the AppPool identity.", steps: ["Enumerate IIS virtual directories.", "Test upload features for server-side execution."] },
    privesc: { vector: "SeImpersonatePrivilege", details: "Service identities can impersonate tokens; Potato attacks coerce SYSTEM authentication locally.", tooling: ["whoami /priv", "GodPotato"], steps: ["Check privileges.", "Pick a Potato that matches the OS version."] },
    remediation: "Use least-privilege service identities; patch.", hint: "whoami /priv.",
  },
  {
    name: "AlwaysInstallElevated", tags: ["MSI", "Registry", "Group Policy"], tools: ["reg query", "winPEAS"], base: "Easy",
    foothold: { vector: "SNMP community string disclosure", details: "SNMP 'public' leaks running processes including a command line with a password.", steps: ["Check UDP 161 with onesixtyone/snmpwalk.", "Read process command lines."] },
    privesc: { vector: "AlwaysInstallElevated in HKLM and HKCU", details: "MSI packages install as SYSTEM for any user.", tooling: ["reg query"], steps: ["Query both keys.", "Understand MSI custom actions."] },
    remediation: "Disable the policy in both hives.", hint: "Two registry keys.",
    ports: [...WINDOWS_BASE, p(161, "snmp", "SNMPv1 server (public)", "udp")],
  },
  {
    name: "DPAPI Credential Recovery", tags: ["DPAPI", "Credential Manager", "Browser Secrets"], tools: ["SharpDPAPI", "mimikatz"], base: "Hard",
    foothold: { vector: "Phished user via a malicious shortcut on a share", details: "A writable 'Public' share is browsed by a scripted user, simulating a client-side attack.", steps: ["Find writable shares.", "Read PEN-200's client-side attacks module."] },
    privesc: { vector: "DPAPI-protected admin credentials", details: "Stored credentials and browser secrets are protected by the user's DPAPI masterkey.", tooling: ["SharpDPAPI", "cmdkey /list"], steps: ["Enumerate stored credentials.", "Understand masterkey derivation."] },
    remediation: "Avoid storing admin credentials on user workstations.", hint: "The user saved more than bookmarks.",
  },
  {
    name: "Registry Autoruns", tags: ["Autoruns", "Registry", "Run Keys"], tools: ["autorunsc", "icacls", "winPEAS"], base: "Easy",
    foothold: { vector: "Exposed VNC with weak password", details: "VNC uses a short password found in a common wordlist.", steps: ["Identify VNC on 5900.", "Test weak passwords."] },
    privesc: { vector: "Writable autorun binary launched at admin logon", details: "An HKLM Run entry points at an executable in a folder writable by Users.", tooling: ["autorunsc", "icacls"], steps: ["List autoruns.", "Check write permissions on each target path."] },
    remediation: "Fix ACLs on autorun targets.", hint: "What starts when the admin logs in?",
    ports: [...WINDOWS_BASE, p(5900, "vnc", "TightVNC 2.8")],
  },
  {
    name: "Scheduled Task Hijack", tags: ["Scheduled Tasks", "Writable Script"], tools: ["schtasks", "icacls"], base: "Medium",
    foothold: { vector: "Credentials in IIS web.config", details: "A readable web.config holds a connection string with a reused local account password.", steps: ["Read configuration files from any file-read primitive.", "Test credential reuse."] },
    privesc: { vector: "SYSTEM scheduled task runs a user-writable script", details: "A cleanup task runs a .ps1 from a folder where Users have modify rights.", tooling: ["schtasks /query /fo LIST /v", "icacls"], steps: ["List tasks with run-as users.", "Check ACLs on task actions."] },
    remediation: "Store task scripts in admin-only folders.", hint: "Look at what runs every five minutes.",
  },
  {
    name: "DLL Hijacking", tags: ["DLL Hijack", "Search Order"], tools: ["Process Monitor", "icacls"], base: "Hard",
    foothold: { vector: "Vulnerable file transfer software", details: "An outdated FTP server product has a public directory traversal exposing a user's files.", steps: ["Fingerprint the FTP banner.", "Research advisories."] },
    privesc: { vector: "Missing DLL in a writable application directory", details: "A SYSTEM service loads a DLL that doesn't exist from a folder Users can write.", tooling: ["Process Monitor", "icacls"], steps: ["Understand DLL search order.", "Find NAME NOT FOUND loads by privileged processes."] },
    remediation: "Fix directory ACLs and use fully qualified DLL paths.", hint: "The service looks for a DLL that isn't there.",
  },
  {
    name: "SeBackupPrivilege", tags: ["SeBackupPrivilege", "SAM", "NTDS"], tools: ["whoami /priv", "reg save", "impacket-secretsdump"], base: "Medium",
    foothold: { vector: "WinRM with credentials from an LDAP description field", details: "A user's description attribute contains their initial password.", steps: ["Dump user attributes over LDAP.", "Read description fields."] },
    privesc: { vector: "Backup Operators / SeBackupPrivilege", details: "Backup privilege allows reading any file regardless of ACLs, including registry hives.", tooling: ["whoami /priv", "reg save", "impacket-secretsdump"], steps: ["Check privileges and groups.", "Understand offline SAM/SYSTEM hash extraction."] },
    remediation: "Restrict Backup Operators membership.", hint: "You can back up anything.",
  },
  {
    name: "Stored Credentials in Files", tags: ["Unattend.xml", "PowerShell History", "Credential Hunting"], tools: ["winPEAS", "findstr"], base: "Easy",
    foothold: { vector: "Outdated web application with default creds", details: "An admin panel uses defaults and supports plugin uploads.", steps: ["Identify the product and version.", "Search for default credentials."] },
    privesc: { vector: "Admin password in PowerShell history / unattend files", details: "ConsoleHost_history.txt and Panther\\Unattend.xml contain the local admin password.", tooling: ["winPEAS", "type (Get-PSReadlineOption).HistorySavePath"], steps: ["Check PowerShell history for every user.", "Search for unattend and sysprep files."] },
    remediation: "Clean deployment artefacts and use LAPS.", hint: "Admins type passwords into consoles too.",
  },
];

const AD_TECHNIQUES: Technique[] = [
  {
    name: "AS-REP Roasting", tags: ["Kerberos", "AS-REP"], tools: ["impacket-GetNPUsers", "hashcat"], base: "Easy",
    foothold: { vector: "AS-REP Roast with a validated user list", details: "One account has pre-auth disabled.", steps: ["Validate usernames with kerbrute.", "Request AS-REPs and crack offline."] },
    privesc: { vector: "Remote Management Users → reused admin password", details: "The cracked user's password is reused by a domain admin's secondary account.", tooling: ["nxc", "evil-winrm"], steps: ["Spray recovered passwords across users.", "Check WinRM access."] },
    remediation: "Enforce pre-auth and unique passwords.", hint: "Pre-auth is optional for one user.",
  },
  {
    name: "Kerberoasting", tags: ["Kerberos", "SPN", "TGS"], tools: ["impacket-GetUserSPNs", "rubeus", "hashcat"], base: "Medium",
    foothold: { vector: "Kerberoast from a low-privilege user", details: "A service account with an SPN has a crackable password.", steps: ["Enumerate SPNs.", "Request TGS tickets and crack offline."] },
    privesc: { vector: "Service account with admin rights on the DC", details: "Misconfigured group membership gives the service account DA-equivalent rights.", tooling: ["bloodhound-ce", "nxc"], steps: ["Check where the service account is admin.", "Map paths in BloodHound."] },
    remediation: "Use gMSAs and AES-only encryption.", hint: "Any user can request a service ticket.",
  },
  {
    name: "Password Spraying", tags: ["Spraying", "Lockout Policy"], tools: ["nxc", "kerbrute"], base: "Easy",
    foothold: { vector: "Password spray against Kerberos", details: "A company-name-plus-year password is common across new starters.", steps: ["Read the password policy.", "Spray one password at a time below the lockout threshold."] },
    privesc: { vector: "GPP cpassword in SYSVOL", details: "An old Group Policy Preferences XML in SYSVOL contains an AES-encrypted password with a public key.", tooling: ["nxc smb -M gpp_password", "gpp-decrypt"], steps: ["Search SYSVOL for Groups.xml and similar.", "Understand why GPP passwords are reversible."] },
    remediation: "Remove GPP passwords (MS14-025) and enforce strong password policy.", hint: "SYSVOL is readable by every domain user.",
  },
  {
    name: "NTLM Relay", tags: ["SMB Relay", "NTLM", "SMB Signing"], tools: ["impacket-ntlmrelayx", "Responder", "nxc"], base: "Medium",
    foothold: { vector: "LLMNR/NBT-NS poisoning", details: "A scripted user mistypes a share name; LLMNR poisoning captures their NetNTLMv2 hash.", steps: ["Run Responder in analysis mode first.", "Understand LLMNR/NBT-NS fallback name resolution."] },
    privesc: { vector: "Relaying to a host without SMB signing", details: "A workstation has SMB signing disabled; the relayed user is a local admin there.", tooling: ["nxc smb --gen-relay-list", "impacket-ntlmrelayx"], steps: ["Enumerate signing status.", "Understand why signing prevents relay."] },
    remediation: "Enforce SMB signing and disable LLMNR/NBT-NS.", hint: "Signing isn't required everywhere.",
  },
  {
    name: "GenericAll Abuse", tags: ["BloodHound", "GenericAll", "ACL"], tools: ["bloodhound-ce", "PowerView", "net rpc"], base: "Medium",
    foothold: { vector: "Credentials in a readable share", details: "A 'Scripts' share holds a logon script with a service password.", steps: ["Spider shares.", "Validate credentials."] },
    privesc: { vector: "GenericAll over a privileged user", details: "Full control over a user allows a password reset or targeted Kerberoast.", tooling: ["bloodhound-ce", "PowerView"], steps: ["Collect BloodHound data.", "Read the GenericAll edge abuse info."] },
    remediation: "Audit delegated ACLs.", hint: "BloodHound draws a line from you to someone important.",
  },
  {
    name: "WriteDacl to DCSync", tags: ["WriteDacl", "DCSync", "Replication Rights"], tools: ["bloodhound-ce", "impacket-dacledit", "impacket-secretsdump"], base: "Hard",
    foothold: { vector: "Kerberoasted service account", details: "A crackable service account is the starting point.", steps: ["Kerberoast.", "Mark the account owned in BloodHound."] },
    privesc: { vector: "WriteDacl on the domain object", details: "WriteDacl can grant replication rights, allowing DCSync of all hashes.", tooling: ["impacket-dacledit", "impacket-secretsdump"], steps: ["Find WriteDacl edges.", "Understand DS-Replication-Get-Changes(-All)."] },
    remediation: "Remove non-standard ACEs on the domain root.", hint: "Rights to change rights.",
  },
  {
    name: "ADCS ESC1", tags: ["ADCS", "ESC1", "Certipy"], tools: ["certipy-ad"], base: "Hard",
    ports: [...DC_BASE, p(80, "http", "Microsoft IIS httpd 10.0 (certsrv)")],
    foothold: { vector: "Low-priv creds from LDAP anonymous bind", details: "Anonymous LDAP reveals a user's password in the info attribute.", steps: ["Test anonymous LDAP.", "Dump user attributes."] },
    privesc: { vector: "Enrollee-supplied SAN template", details: "A client-auth template lets requesters choose the subject.", tooling: ["certipy-ad find -vulnerable"], steps: ["Enumerate templates.", "Read the ESC1 conditions."] },
    remediation: "Harden templates and enrollment rights.", hint: "Templates can be vulnerable too.",
  },
  {
    name: "Unconstrained Delegation", tags: ["Delegation", "TGT Capture", "Printer Bug"], tools: ["rubeus", "PowerView", "bloodhound-ce"], base: "Hard",
    foothold: { vector: "Local admin on a server with unconstrained delegation", details: "A web server trusted for unconstrained delegation is compromised via its app.", steps: ["Find hosts with TRUSTED_FOR_DELEGATION.", "Compromise one of them."] },
    privesc: { vector: "Coerced DC authentication captured on the delegation host", details: "Coercion causes the DC to authenticate to the delegation host, caching its TGT.", tooling: ["rubeus monitor", "PetitPotam / SpoolSample (concept)"], steps: ["Understand unconstrained delegation.", "Study coercion techniques conceptually."] },
    remediation: "Remove unconstrained delegation; mark sensitive accounts.", hint: "This server keeps everyone's TGT.",
  },
  {
    name: "ForceChangePassword Chain", tags: ["BloodHound", "ForceChangePassword", "AddMember"], tools: ["bloodhound-ce", "net rpc", "impacket-*"], base: "Medium",
    foothold: { vector: "SMB null session user enumeration + weak password", details: "RID cycling yields users; one uses username-as-password.", steps: ["RID cycle with nxc.", "Test username=password carefully."] },
    privesc: { vector: "ForceChangePassword → AddMember to privileged group", details: "A two-edge chain ends in membership of a group with DC admin rights.", tooling: ["bloodhound-ce"], steps: ["Find the shortest path.", "Note each edge's abuse method."] },
    remediation: "Prune helpdesk ACLs.", hint: "Two hops in BloodHound.",
  },
  {
    name: "LAPS Read Rights", tags: ["LAPS", "ReadLAPSPassword"], tools: ["nxc", "bloodhound-ce"], base: "Medium",
    foothold: { vector: "Credentials in a public-facing intranet", details: "An intranet FAQ page lists a helpdesk account password.", steps: ["Read all intranet pages.", "Validate credentials."] },
    privesc: { vector: "ReadLAPSPassword on a server", details: "Helpdesk can read the ms-Mcs-AdmPwd attribute of a server where a DA is logged in.", tooling: ["nxc ldap -M laps", "bloodhound-ce"], steps: ["Find ReadLAPSPassword edges.", "Check sessions on the target host."] },
    remediation: "Scope LAPS read rights tightly.", hint: "Helpdesk can read more than tickets.",
  },
];

const PIVOT_TECHNIQUES: Technique[] = [
  {
    name: "Ligolo-ng Pivot", tags: ["Ligolo-ng", "TUN"], tools: ["ligolo-ng"], base: "Medium",
    foothold: { vector: "Web app RCE on a dual-homed host", details: "The DMZ host has a second NIC into an internal subnet.", steps: ["Check interfaces and routes after landing.", "Plan the pivot."] },
    privesc: { vector: "Internal service reached through Ligolo-ng", details: "An internal-only service reuses credentials from the foothold.", tooling: ["ligolo-ng", "nmap"], steps: ["Run proxy and agent.", "Add routes and scan."] },
    remediation: "Segment networks with firewalls.", hint: "ip route shows another network.",
  },
  {
    name: "Chisel Reverse SOCKS", tags: ["Chisel", "SOCKS5", "proxychains"], tools: ["chisel", "proxychains"], base: "Medium",
    foothold: { vector: "Windows foothold without SSH", details: "No SSH on the pivot, so a reverse tunnel is needed.", steps: ["Transfer the tool.", "Build a reverse SOCKS proxy."] },
    privesc: { vector: "Internal MSSQL reached through SOCKS", details: "An internal SQL server accepts reused creds.", tooling: ["chisel", "proxychains", "impacket-mssqlclient"], steps: ["Configure proxychains.", "Test each tool through the proxy."] },
    remediation: "Block outbound connections from servers.", hint: "Reverse it: the pivot connects to you.",
  },
  {
    name: "SSH Local Port Forward", tags: ["SSH -L", "Local Forward"], tools: ["ssh"], base: "Easy",
    foothold: { vector: "SSH with recovered credentials", details: "Credentials from a web config work for SSH.", steps: ["Test credential reuse on SSH.", "Check listening local services."] },
    privesc: { vector: "Localhost-only admin panel reached via -L", details: "A root-run admin panel on 127.0.0.1:8080 has default creds.", tooling: ["ss -tlnp", "ssh -L"], steps: ["List localhost listeners.", "Forward the port to your box."] },
    remediation: "Authenticate localhost services too.", hint: "ss -tlnp shows something on 127.0.0.1.",
  },
  {
    name: "SSH Dynamic Forward", tags: ["SSH -D", "SOCKS"], tools: ["ssh", "proxychains"], base: "Easy",
    foothold: { vector: "SSH key in a backup archive", details: "A backup tarball on the website contains an SSH key.", steps: ["Look for backup files.", "Check key permissions."] },
    privesc: { vector: "Internal subnet scanned via SOCKS", details: "A SOCKS proxy over SSH reaches an internal Windows host with weak SMB creds.", tooling: ["ssh -D", "proxychains", "nxc"], steps: ["Build the dynamic forward.", "Use TCP connect scans through SOCKS."] },
    remediation: "Disable SSH forwarding where not needed.", hint: "One SSH flag gives you a SOCKS proxy.",
  },
  {
    name: "SSH Remote Port Forward", tags: ["SSH -R", "Reverse Forward"], tools: ["ssh"], base: "Medium",
    foothold: { vector: "Foothold on a host that can't receive inbound connections", details: "Egress is allowed only on 22 outbound.", steps: ["Test egress ports.", "Plan a reverse tunnel."] },
    privesc: { vector: "Reverse forward exposes an internal service to Kali", details: "-R publishes an internal service on your Kali box.", tooling: ["ssh -R", "sshd_config GatewayPorts"], steps: ["Understand -R direction.", "Harden your Kali SSH first."] },
    remediation: "Restrict egress.", hint: "Only port 22 gets out.",
  },
  {
    name: "Socat Relay", tags: ["Socat", "Port Relay"], tools: ["socat"], base: "Easy",
    foothold: { vector: "Command injection on a pivot box", details: "A diagnostics page gives a shell on a host that bridges two subnets.", steps: ["Find the second subnet.", "Check which tools are present."] },
    privesc: { vector: "Socat port relay to an internal web server", details: "A simple TCP relay exposes an internal app with an upload bug.", tooling: ["socat"], steps: ["Understand TCP-LISTEN/TCP relays.", "Test the relay end-to-end."] },
    remediation: "Restrict lateral traffic.", hint: "A relay is the simplest tunnel.",
  },
  {
    name: "Double Pivot", tags: ["Double Pivot", "Ligolo-ng", "Chained Tunnels"], tools: ["ligolo-ng", "chisel"], base: "Hard",
    foothold: { vector: "Second-hop credentials on the first pivot", details: "An SSH config on pivot 1 names a host on a deeper subnet.", steps: ["Read ~/.ssh/config and known_hosts.", "Map every subnet."] },
    privesc: { vector: "Third-subnet target via chained listeners", details: "Ligolo-ng listeners chain agents through the first pivot.", tooling: ["ligolo-ng listener_add"], steps: ["Draw the network.", "Add a listener on the first agent for the second."] },
    remediation: "Isolate management networks.", hint: "Two hops; draw it first.",
  },
  {
    name: "Port Forward with netsh / plink", tags: ["netsh portproxy", "plink", "Windows Pivot"], tools: ["netsh", "plink"], base: "Medium",
    foothold: { vector: "Admin foothold on a Windows jump host", details: "Credentials from a previous box give admin on a Windows jump host.", steps: ["Check interfaces with ipconfig.", "Check firewall rules."] },
    privesc: { vector: "netsh portproxy to an internal RDP/SMB host", details: "Native Windows tooling can forward ports without uploading binaries.", tooling: ["netsh interface portproxy", "netsh advfirewall"], steps: ["Understand portproxy rules.", "Open the firewall for your rule."] },
    remediation: "Monitor portproxy registry changes.", hint: "Windows can forward ports natively.",
  },
];

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

const DOMAIN_PLAN: { domain: Domain; count: number }[] = [
  { domain: "Web Exploitation", count: 40 },
  { domain: "Linux PrivEsc", count: 40 },
  { domain: "Windows PrivEsc", count: 40 },
  { domain: "Active Directory", count: 40 },
  { domain: "Pivoting & Tunneling", count: 20 },
  { domain: "Exam Chains", count: 20 },
];

const DIFF_CYCLE: Record<Difficulty, Difficulty[]> = {
  Easy: ["Easy", "Easy", "Medium", "Easy", "Medium"],
  Medium: ["Medium", "Easy", "Medium", "Hard", "Medium"],
  Hard: ["Hard", "Medium", "Hard", "Hard", "Medium"],
};

function techniquePool(domain: Domain): Technique[] {
  switch (domain) {
    case "Web Exploitation":
      return WEB_TECHNIQUES;
    case "Linux PrivEsc":
      return LINUX_TECHNIQUES;
    case "Windows PrivEsc":
      return WINDOWS_TECHNIQUES;
    case "Active Directory":
      return AD_TECHNIQUES;
    case "Pivoting & Tunneling":
      return PIVOT_TECHNIQUES;
    case "Exam Chains":
      return [];
  }
}

function osFor(domain: Domain, t: Technique, seed: number): OS {
  switch (domain) {
    case "Linux PrivEsc":
      return "Linux";
    case "Windows PrivEsc":
      return "Windows";
    case "Active Directory":
    case "Exam Chains":
      return "Active Directory";
    case "Pivoting & Tunneling":
      return t.tags.some((x) => /netsh|Windows|Chisel/.test(x)) ? "Windows" : "Linux";
    case "Web Exploitation":
      return seed % 6 === 4 ? "Windows" : "Linux";
  }
}

function portsFor(domain: Domain, t: Technique, seed: number): PortService[] {
  if (t.ports) return t.ports;
  switch (domain) {
    case "Web Exploitation":
      return pick(WEB_STACKS, seed).ports;
    case "Linux PrivEsc":
    case "Pivoting & Tunneling":
      return LINUX_BASE;
    case "Windows PrivEsc":
      return [...WINDOWS_BASE, p(80, "http", "Microsoft IIS httpd 10.0")];
    case "Active Directory":
    case "Exam Chains":
      return DC_BASE;
  }
}

const CHAIN_ENTRIES: { standalone: string; client: string; dc: string; lead: string }[] = [
  { standalone: "Web app SQL injection → local SYSTEM via SeImpersonate", client: "Cached domain credentials", dc: "Kerberoast → privileged group", lead: "MSSQL-backed portal" },
  { standalone: "Linux CMS RCE → sudo misconfiguration", client: "Credential reuse over WinRM", dc: "ACL abuse (GenericAll) → DCSync", lead: "Outdated CMS" },
  { standalone: "File upload bypass → Potato", client: "AS-REP roastable user", dc: "ADCS ESC1", lead: "Upload portal" },
  { standalone: "SSTI on Python app → capabilities", client: "Password spraying", dc: "WriteDacl → DCSync", lead: "Flask application" },
  { standalone: "Jenkins script console", client: "DPAPI saved credentials", dc: "Unconstrained delegation", lead: "CI server" },
  { standalone: "LFI → log poisoning → cron", client: "NTLM relay to unsigned host", dc: "LAPS read rights → DA session", lead: "PHP intranet" },
  { standalone: "Exposed .git → deploy creds", client: "Unquoted service path", dc: "GPP cpassword in SYSVOL", lead: "Developer portal" },
  { standalone: "Tomcat manager default creds", client: "AlwaysInstallElevated", dc: "ForceChangePassword chain", lead: "Java app server" },
  { standalone: "SNMP disclosure → service creds", client: "Scheduled task hijack", dc: "Kerberoasting", lead: "Network monitoring host" },
  { standalone: "WordPress plugin file read", client: "Keytab on domain-joined Linux", dc: "ADCS ESC1", lead: "Marketing site" },
];

function generateLab(domain: Domain, slot: number, globalIndex: number): Draft {
  const seed = hash(`${domain}:${slot}`);
  const name = codename(globalIndex);

  if (domain === "Exam Chains") {
    const c = CHAIN_ENTRIES[slot % CHAIN_ENTRIES.length];
    const adDomain = pick(AD_DOMAINS, seed);
    const octet = 140 + slot;
    const chain: ChainHost[] = [
      { role: "Standalone", hostname: `${name.split("-")[1].toUpperCase()}-WEB`, ip: `192.168.${octet}.10`, os: slot % 2 ? "Ubuntu 22.04" : "Windows Server 2019", summary: c.standalone },
      { role: "Client", hostname: `WS${String(slot + 1).padStart(2, "0")}`, ip: `172.16.${octet}.20`, os: "Windows 11", summary: c.client },
      { role: "Domain Controller", hostname: "DC01", ip: `172.16.${octet}.5`, os: "Windows Server 2022", summary: `${adDomain}: ${c.dc}` },
    ];
    return {
      name,
      os: "Active Directory",
      difficulty: "Hard",
      domain,
      tags: ["Exam Simulation", "Standalone + Client + DC", ...c.dc.split(/ → |\(|\)/).map((s) => s.trim()).filter(Boolean).slice(0, 2)],
      cves: [],
      tools: ["nmap", "nxc", "ligolo-ng", "bloodhound-ce", "impacket-*", "mimikatz"],
      summary: `Three-host exam set for ${adDomain}: ${c.lead} on the edge, a domain client behind it, and the DC.`,
      ports: slot % 2 ? [p(22, "ssh", "OpenSSH 8.9p1 Ubuntu"), p(80, "http", "Apache httpd 2.4.52")] : [p(80, "http", "Microsoft IIS httpd 10.0"), p(445, "microsoft-ds", "SMB"), p(5985, "http", "WinRM")],
      foothold: {
        vector: c.standalone,
        details: `Only the standalone host is reachable at the start. ${c.lead} is the entry point; local escalation there unlocks credentials for the internal network.`,
        steps: ["Enumerate the external host exhaustively; it is the only way in.", "Escalate locally and loot credentials before pivoting.", "Stand up a Ligolo-ng tunnel into the internal subnet."],
      },
      privesc: {
        vector: `${c.client} → ${c.dc}`,
        details: `On the client: ${c.client.toLowerCase()}. From there BloodHound reveals the final step to the DC: ${c.dc}.`,
        tooling: ["ligolo-ng", "bloodhound-ce", "nxc", "impacket-*"],
        steps: ["Re-run enumeration from inside the network.", "Collect BloodHound data with any domain user.", "Document every credential and where it works (exam report habit)."],
      },
      remediation: "Patch the perimeter host, eliminate credential reuse, and remediate the AD misconfiguration on the final step.",
      hint: "Loot every host you own before moving on.",
      chain,
    };
  }

  const pool = techniquePool(domain);
  const t = pool[slot % pool.length];
  const round = Math.floor(slot / pool.length);
  const difficulty = DIFF_CYCLE[t.base][(round + (seed % 5)) % 5];
  const os = osFor(domain, t, seed);
  const stack = domain === "Web Exploitation" && !t.ports ? pick(WEB_STACKS, seed) : null;
  const flavour = stack ? ` on a ${stack.label} stack` : domain === "Active Directory" ? ` in ${pick(AD_DOMAINS, seed)}` : "";
  const variant = round > 0 ? ` (variant ${round + 1})` : "";

  return {
    name,
    os,
    difficulty,
    domain,
    tags: [...t.tags],
    cves: t.cves ? [...t.cves] : [],
    tools: [...t.tools],
    summary: `${t.name}${flavour}${variant}. Foothold via ${t.foothold.vector.toLowerCase()}; escalate through ${t.privesc.vector.toLowerCase()}.`,
    ports: portsFor(domain, t, seed),
    foothold: { ...t.foothold, steps: [...t.foothold.steps] },
    privesc: { ...t.privesc, tooling: [...t.privesc.tooling], steps: [...t.privesc.steps] },
    remediation: t.remediation,
    hint: t.hint,
    chain:
      domain === "Pivoting & Tunneling"
        ? [
            { role: "Pivot", hostname: name, ip: `10.10.11.${10 + globalIndex} ↔ 172.16.${30 + slot}.5`, os: os === "Windows" ? "Windows Server 2019" : "Ubuntu 22.04", summary: "Initial foothold and tunnel endpoint." },
            { role: "Internal", hostname: `int-${name.split("-")[1]}`, ip: `172.16.${30 + slot}.${20 + (seed % 200)}`, os: seed % 2 ? "Windows Server 2022" : "Debian 12", summary: "Internal target reachable only through the pivot." },
          ]
        : undefined,
  };
}

function buildCurriculum(): Lab[] {
  const labs: Lab[] = [];
  let index = 0;
  for (const { domain, count } of DOMAIN_PLAN) {
    const flagships = FLAGSHIPS.filter((f) => f.domain === domain);
    for (let slot = 0; slot < count; slot++) {
      const isFlagship = slot < flagships.length;
      const draft = isFlagship ? flagships[slot] : generateLab(domain, slot - flagships.length, index);
      const id = `LAB-${String(index + 1).padStart(3, "0")}`;
      labs.push({
        ...draft,
        id,
        ip: `10.10.11.${10 + index}`,
        xp: XP_REWARDS.lab[draft.difficulty],
        flagship: isFlagship,
        flags: flagsFor(id),
      });
      index++;
    }
  }
  return labs;
}

export const ALL_LABS: Lab[] = buildCurriculum();

export const LABS_BY_ID: Record<string, Lab> = Object.fromEntries(ALL_LABS.map((l) => [l.id, l]));
