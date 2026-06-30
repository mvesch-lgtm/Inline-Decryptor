example with php:
create a file called for example: Encrypt_Function.php with content:
```php
<?php
function encryptData($text, $wachtwoord) {
    $key = hash('sha256', $wachtwoord, true);
    $iv = openssl_random_pseudo_bytes(12);
    $tag = ""; 
    
    $encrypted = openssl_encrypt($text, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
    $output = base64_encode($iv . $tag . $encrypted);
    
    return "<encrypt-tekst-excrypt>" . $output . "</encrypt-tekst-excrypt>";
}
?>

```

also have somewhere set the password for example settings.php:
```php
<?php
$wachtwoord = "mijn-geheime-wachtwoord";
?>
```

then use in your file:
```php
<?php
include_once 'settings.php';
include_once 'Encrypt_Function.php';
?>

<div>
	<br><?php echo encryptData("Direct in regel", $wachtwoord); ?>
</div>
```



Privacy Policy

<p>English.</p>
<p>This browser extension does not collect, share, or transmit any personal data.</p>

<p>Data storage</p>
<p>All data — the password vault and your settings — is stored exclusively on your own device, encrypted with AES-GCM. The encryption key is derived from your master password using PBKDF2 and is never stored anywhere.</p>

<p>No collection or transmission</p>
<p>The extension does not connect to any external server. No data is collected, shared, sold, or transferred to third parties. There is no tracking, no analytics, and no advertising.</p>

<p>Website access</p>
<p>The extension reads web pages only to locate specific encrypted tags and decrypt them in place. No page content is stored or transmitted.</p>

<p>Nederlands</p>
<p>Deze browserextensie verzamelt, deelt of verzendt geen persoonlijke gegevens.</p>

<p>Gegevensopslag</p>
<p>Alle gegevens — de wachtwoordkluis en je instellingen — worden uitsluitend lokaal op je eigen apparaat bewaard, versleuteld met AES-GCM. De sleutel wordt afgeleid uit het hoofdwachtwoord met PBKDF2 en wordt nergens opgeslagen.</p>

<p>Geen verzameling of verzending</p>
<p>De extensie maakt geen verbinding met externe servers. Er worden geen gegevens verzameld, gedeeld, verkocht of overgedragen aan derden. Er is geen tracking, geen analytics en geen advertenties.</p>

<p>Toegang tot websites</p>
<p>De extensie leest webpagina's alleen om specifieke versleutelde tags te vinden en ter plekke te ontsleutelen. Er wordt geen pagina-inhoud opgeslagen of verzonden.</p>
