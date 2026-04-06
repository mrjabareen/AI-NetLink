# NetLink Publisher
# Standalone Windows release publisher for AI-NetLink.

Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase
Add-Type -AssemblyName System.Windows.Forms

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$PublisherConfigDir = Join-Path $env:APPDATA 'NetLinkPublisher'
$PublisherConfigPath = Join-Path $PublisherConfigDir 'publisher-config.json'
$StringsPath = Join-Path $PSScriptRoot 'Publisher.strings.json'

function Get-DefaultConfig {
    return @{
        ProjectPath = 'C:\Users\aljabareen\Desktop\AI NetLink'
        RepoUrl = 'https://github.com/mrjabareen/AI-NetLink.git'
        Username = 'mrjabareen'
        Token = ''
    }
}

function Load-PublisherConfig {
    $defaults = Get-DefaultConfig
    if (-not (Test-Path $PublisherConfigPath)) {
        return $defaults
    }

    try {
        $raw = Get-Content -Path $PublisherConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
        foreach ($key in @('ProjectPath', 'RepoUrl', 'Username', 'Token')) {
            $value = $raw.PSObject.Properties[$key].Value
            if ($null -ne $value -and [string]$value -ne '') {
                $defaults[$key] = [string]$value
            }
        }
    } catch {
        # Ignore broken config and continue with defaults.
    }

    return $defaults
}

function Save-PublisherConfig([hashtable]$config) {
    if (-not (Test-Path $PublisherConfigDir)) {
        New-Item -ItemType Directory -Path $PublisherConfigDir | Out-Null
    }

    Write-Utf8NoBomFile -path $PublisherConfigPath -content ($config | ConvertTo-Json -Depth 5)
}

function Load-Strings {
    if (-not (Test-Path $StringsPath)) {
        throw 'Publisher.strings.json was not found.'
    }
    return Read-JsonFile $StringsPath
}

function Quote-GitArgument([string]$value) {
    return '"' + ($value -replace '"', '\"') + '"'
}

function Invoke-Git([string]$arguments, [string]$workingDirectory) {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = 'git'
    $psi.Arguments = $arguments
    $psi.WorkingDirectory = $workingDirectory
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true

    $process = [System.Diagnostics.Process]::Start($psi)
    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    $process.WaitForExit()

    return @{
        ExitCode = $process.ExitCode
        Output = (($stdout + [Environment]::NewLine + $stderr).Trim())
    }
}

function Resolve-ProjectContext([string]$selectedPath) {
    if ([string]::IsNullOrWhiteSpace($selectedPath)) {
        throw (Get-Text 'errSelectProject')
    }

    $candidate = [System.IO.Path]::GetFullPath($selectedPath.Trim())
    if (-not (Test-Path $candidate)) {
        throw (Get-Text 'errFolderMissing')
    }

    $repoRoot = $candidate
    $gitTopLevel = Invoke-Git 'rev-parse --show-toplevel' $candidate
    if ($gitTopLevel.ExitCode -eq 0 -and $gitTopLevel.Output) {
        $repoRoot = ($gitTopLevel.Output -split "`r?`n")[0].Trim()
    }

    $appRoot = Join-Path $repoRoot 'AI NetLink Interface\ai-net-link'
    if (-not (Test-Path (Join-Path $appRoot 'public\version.json'))) {
        if ((Test-Path (Join-Path $candidate 'public\version.json')) -and (Test-Path (Join-Path $candidate 'package.json'))) {
            $appRoot = $candidate
        } else {
            throw (Get-Text 'errAppRootMissing')
        }
    }

    $packagePath = Join-Path $appRoot 'package.json'
    $fallbackProjectName = Split-Path $repoRoot -Leaf
    if ([string]::IsNullOrWhiteSpace($fallbackProjectName)) {
        $fallbackProjectName = 'AI NetLink'
    }
    $projectMeta = Load-ProjectMetadata $packagePath $fallbackProjectName

    return @{
        RepoRoot = $repoRoot
        AppRoot = $appRoot
        VersionPath = Join-Path $appRoot 'public\version.json'
        PackagePath = $packagePath
        ProjectName = $projectMeta.ProjectName
    }
}

function Load-VersionData([string]$versionPath) {
    if (-not (Test-Path $versionPath)) {
        throw (Get-Text 'errVersionMissing')
    }

    $data = Read-JsonFile $versionPath
    return @{
        Version = [string]$data.version
        BuildDate = [string]$data.buildDate
        Changelog = @($data.changelog | ForEach-Object { [string]$_ })
    }
}

function Save-VersionData([string]$versionPath, [string]$version, [string]$buildDate, [string[]]$changelog) {
    $payload = @{
        version = $version.Trim()
        buildDate = $buildDate.Trim()
        changelog = $changelog
    }

    Write-Utf8NoBomFile -path $versionPath -content ($payload | ConvertTo-Json -Depth 5)
}

function Build-AuthenticatedUrl([string]$repoUrl, [string]$token) {
    $cleanRepo = $repoUrl.Trim()
    if ($cleanRepo -notmatch '^https://') {
        throw (Get-Text 'errRepoUrlInvalid')
    }

    if ([string]::IsNullOrWhiteSpace($token)) {
        throw (Get-Text 'errTokenMissing')
    }

    return $cleanRepo -replace '^https://', ("https://{0}@" -f $token.Trim())
}

function Write-Utf8NoBomFile([string]$path, [string]$content) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
}

function Remove-Bom([string]$text) {
    return [string]$text -replace "^\uFEFF", ''
}

function Read-JsonFile([string]$path) {
    $raw = Get-Content -Path $path -Raw -Encoding UTF8
    return (Remove-Bom $raw) | ConvertFrom-Json
}

function Load-ProjectMetadata([string]$packagePath, [string]$fallbackName = 'AI NetLink') {
    if (-not (Test-Path $packagePath)) {
        return @{ ProjectName = $fallbackName }
    }

    try {
        $package = Read-JsonFile $packagePath
        $name = [string]$package.name
        if ([string]::IsNullOrWhiteSpace($name) -or $name -match '^(react-example|app|vite-project)$') {
            $name = $fallbackName
        }
        return @{ ProjectName = $name }
    } catch {
        return @{ ProjectName = $fallbackName }
    }
}

function Get-GitHubRepoInfo([string]$repoUrl) {
    $cleanRepo = $repoUrl.Trim().TrimEnd('/')
    if ($cleanRepo.EndsWith('.git')) {
        $cleanRepo = $cleanRepo.Substring(0, $cleanRepo.Length - 4)
    }

    $parts = $cleanRepo.Split('/')
    if ($parts.Length -lt 2) {
        throw (Get-Text 'errRepoUrlInvalid')
    }

    return @{
        Owner = $parts[$parts.Length - 2]
        Name = $parts[$parts.Length - 1]
    }
}

function Get-RemoteVersionData([string]$repoUrl, [string]$token) {
    $repo = Get-GitHubRepoInfo $repoUrl
    $remotePath = 'AI NetLink Interface/ai-net-link/public/version.json'
    $apiUrl = "https://api.github.com/repos/$($repo.Owner)/$($repo.Name)/contents/$([uri]::EscapeDataString($remotePath))?ref=main"

    $headers = @{
        'Accept' = 'application/vnd.github+json'
        'User-Agent' = 'NetLinkPublisher'
    }
    if (-not [string]::IsNullOrWhiteSpace($token)) {
        $headers['Authorization'] = "token $($token.Trim())"
    }

    $response = Invoke-RestMethod -Uri $apiUrl -Headers $headers -Method Get
    if (-not $response.content) {
        throw (Get-Text 'errRemoteVersionMissing')
    }

    $content = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String(([string]$response.content).Replace("`n", '').Replace("`r", '')))
    return (Remove-Bom $content) | ConvertFrom-Json
}

function Write-Log([string]$message) {
    $txtLog.AppendText(("[{0}] {1}{2}" -f (Get-Date -Format 'HH:mm:ss'), $message, [Environment]::NewLine))
    $txtLog.ScrollToEnd()
}

$script:Strings = Load-Strings
$script:CurrentLanguage = 'ar'
$config = Load-PublisherConfig

function Get-Text([string]$key) {
    $lang = $script:Strings.PSObject.Properties[$script:CurrentLanguage].Value
    return [string]$lang.PSObject.Properties[$key].Value
}

[xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="NetLink Publisher"
        Height="940"
        Width="1400"
        MinHeight="860"
        MinWidth="1200"
        WindowStartupLocation="CenterScreen"
        ResizeMode="CanMinimize"
        Background="#020617"
        FontFamily="Segoe UI">
  <Window.Resources>
    <SolidColorBrush x:Key="CardBrush" Color="#111827"/>
    <SolidColorBrush x:Key="BorderBrush" Color="#233047"/>
    <SolidColorBrush x:Key="TextBrush" Color="#E2E8F0"/>
    <SolidColorBrush x:Key="TealBrush" Color="#14B8A6"/>
    <Style x:Key="CardStyle" TargetType="Border">
      <Setter Property="Background" Value="{StaticResource CardBrush}"/>
      <Setter Property="BorderBrush" Value="{StaticResource BorderBrush}"/>
      <Setter Property="BorderThickness" Value="1"/>
      <Setter Property="CornerRadius" Value="28"/>
      <Setter Property="Padding" Value="26"/>
      <Setter Property="Margin" Value="0,0,0,22"/>
    </Style>
    <Style x:Key="LabelStyle" TargetType="TextBlock">
      <Setter Property="Foreground" Value="#CBD5E1"/>
      <Setter Property="FontSize" Value="13"/>
      <Setter Property="Margin" Value="0,0,0,8"/>
      <Setter Property="FontWeight" Value="SemiBold"/>
    </Style>
    <Style x:Key="InputStyle" TargetType="TextBox">
      <Setter Property="Foreground" Value="{StaticResource TextBrush}"/>
      <Setter Property="Background" Value="#091121"/>
      <Setter Property="BorderBrush" Value="#233047"/>
      <Setter Property="BorderThickness" Value="1"/>
      <Setter Property="Padding" Value="12,10"/>
      <Setter Property="FontSize" Value="14"/>
      <Setter Property="Margin" Value="0,0,0,18"/>
      <Setter Property="CaretBrush" Value="#14B8A6"/>
    </Style>
    <Style x:Key="PasswordStyle" TargetType="PasswordBox">
      <Setter Property="Foreground" Value="{StaticResource TextBrush}"/>
      <Setter Property="Background" Value="#091121"/>
      <Setter Property="BorderBrush" Value="#233047"/>
      <Setter Property="BorderThickness" Value="1"/>
      <Setter Property="Padding" Value="12,10"/>
      <Setter Property="FontSize" Value="14"/>
      <Setter Property="Margin" Value="0,0,0,18"/>
    </Style>
    <Style x:Key="PrimaryButtonStyle" TargetType="Button">
      <Setter Property="Foreground" Value="White"/>
      <Setter Property="Background" Value="{StaticResource TealBrush}"/>
      <Setter Property="BorderThickness" Value="0"/>
      <Setter Property="Cursor" Value="Hand"/>
      <Setter Property="Padding" Value="18,12"/>
      <Setter Property="FontSize" Value="14"/>
      <Setter Property="FontWeight" Value="Bold"/>
      <Setter Property="Template">
        <Setter.Value>
          <ControlTemplate TargetType="Button">
            <Border Background="{TemplateBinding Background}" CornerRadius="16">
              <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
            </Border>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>
    <Style x:Key="SecondaryButtonStyle" TargetType="Button" BasedOn="{StaticResource PrimaryButtonStyle}">
      <Setter Property="Background" Value="#172033"/>
      <Setter Property="Foreground" Value="#E2E8F0"/>
    </Style>
    <Style x:Key="LangButtonStyle" TargetType="Button" BasedOn="{StaticResource SecondaryButtonStyle}">
      <Setter Property="Padding" Value="16,10"/>
      <Setter Property="Margin" Value="0,0,12,0"/>
    </Style>
  </Window.Resources>

  <Grid Margin="24">
    <Grid.RowDefinitions>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="*"/>
    </Grid.RowDefinitions>

    <Border Grid.Row="0" CornerRadius="34" Padding="30" Margin="0,0,0,24" BorderBrush="#20304A" BorderThickness="1">
      <Border.Background>
        <LinearGradientBrush StartPoint="0,0" EndPoint="1,1">
          <GradientStop Color="#071121" Offset="0"/>
          <GradientStop Color="#111827" Offset="0.45"/>
          <GradientStop Color="#1E1B4B" Offset="1"/>
        </LinearGradientBrush>
      </Border.Background>
      <Grid>
        <Grid.ColumnDefinitions>
          <ColumnDefinition Width="*"/>
          <ColumnDefinition Width="Auto"/>
        </Grid.ColumnDefinitions>
        <StackPanel>
          <TextBlock x:Name="AppTitle" FontSize="34" FontWeight="Bold" Foreground="White"/>
          <TextBlock x:Name="AppSubtitle" Margin="0,10,0,0" Foreground="#C7D2FE" FontSize="15" TextWrapping="Wrap"/>
          <StackPanel Orientation="Horizontal" Margin="0,22,0,0">
            <Border Background="#0B1220" BorderBrush="#2A3A59" BorderThickness="1" CornerRadius="999" Padding="14,8" Margin="0,0,12,0">
              <TextBlock x:Name="BadgeProject" Foreground="#E2E8F0" FontWeight="SemiBold"/>
            </Border>
            <Border Background="#0B1220" BorderBrush="#2A3A59" BorderThickness="1" CornerRadius="999" Padding="14,8">
              <TextBlock x:Name="BadgeRelease" Foreground="#E2E8F0" FontWeight="SemiBold"/>
            </Border>
          </StackPanel>
        </StackPanel>
        <StackPanel Grid.Column="1" Orientation="Horizontal" VerticalAlignment="Top" HorizontalAlignment="Right">
          <Button x:Name="BtnArabic" Style="{StaticResource LangButtonStyle}" MinWidth="120"/>
          <Button x:Name="BtnEnglish" Style="{StaticResource LangButtonStyle}" Margin="0"/>
        </StackPanel>
      </Grid>
    </Border>

    <ScrollViewer Grid.Row="1" VerticalScrollBarVisibility="Auto" HorizontalScrollBarVisibility="Disabled">
      <StackPanel>
        <Border Style="{StaticResource CardStyle}">
          <StackPanel>
            <TextBlock x:Name="ProjectCardTitle" FontSize="20" FontWeight="Bold" Foreground="White"/>
            <TextBlock x:Name="ProjectCardHint" Margin="0,8,0,20" Foreground="#94A3B8" TextWrapping="Wrap"/>

            <TextBlock x:Name="LblProjectPath" Style="{StaticResource LabelStyle}"/>
            <Grid Margin="0,0,0,18">
              <Grid.ColumnDefinitions>
                <ColumnDefinition Width="*"/>
                <ColumnDefinition Width="190"/>
              </Grid.ColumnDefinitions>
              <TextBox x:Name="TxtProjectPath" Style="{StaticResource InputStyle}" Margin="0,0,14,0"/>
              <Button x:Name="BtnBrowse" Grid.Column="1" Style="{StaticResource SecondaryButtonStyle}" Height="46"/>
            </Grid>

            <TextBlock x:Name="LblRepoUrl" Style="{StaticResource LabelStyle}"/>
            <TextBox x:Name="TxtRepoUrl" Style="{StaticResource InputStyle}"/>

            <Grid Margin="0,0,0,6">
              <Grid.ColumnDefinitions>
                <ColumnDefinition Width="*"/>
                <ColumnDefinition Width="*"/>
              </Grid.ColumnDefinitions>
              <StackPanel Grid.Column="0" Margin="0,0,14,0">
                <TextBlock x:Name="LblUsername" Style="{StaticResource LabelStyle}"/>
                <TextBox x:Name="TxtUsername" Style="{StaticResource InputStyle}"/>
              </StackPanel>
              <StackPanel Grid.Column="1">
                <TextBlock x:Name="LblToken" Style="{StaticResource LabelStyle}"/>
                <Grid>
                  <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="110"/>
                  </Grid.ColumnDefinitions>
                  <PasswordBox x:Name="TxtTokenPassword" Style="{StaticResource PasswordStyle}" Margin="0,0,14,0"/>
                  <TextBox x:Name="TxtTokenVisible" Style="{StaticResource InputStyle}" Visibility="Collapsed" Margin="0,0,14,18"/>
                  <Button x:Name="BtnToggleToken" Grid.Column="1" Style="{StaticResource SecondaryButtonStyle}" Height="46"/>
                </Grid>
              </StackPanel>
            </Grid>

            <Button x:Name="BtnSaveSettings" Style="{StaticResource SecondaryButtonStyle}" HorizontalAlignment="Left" Width="200" Height="48"/>
          </StackPanel>
        </Border>

        <Grid Margin="0,0,0,2">
          <Grid.ColumnDefinitions>
            <ColumnDefinition Width="0.9*"/>
            <ColumnDefinition Width="1.1*"/>
          </Grid.ColumnDefinitions>

          <Border Grid.Column="0" Style="{StaticResource CardStyle}" Margin="0,0,12,22">
            <StackPanel>
              <TextBlock x:Name="StatusCardTitle" FontSize="20" FontWeight="Bold" Foreground="White"/>
              <TextBlock x:Name="StatusCardHint" Margin="0,8,0,18" Foreground="#94A3B8" TextWrapping="Wrap"/>

              <Grid Margin="0,0,0,14">
                <Grid.ColumnDefinitions>
                  <ColumnDefinition Width="*"/>
                  <ColumnDefinition Width="*"/>
                  <ColumnDefinition Width="*"/>
                </Grid.ColumnDefinitions>
                <Border Grid.Column="0" Background="#111827" BorderBrush="#364152" BorderThickness="1" CornerRadius="20" Padding="18" Margin="0,0,12,0">
                  <StackPanel>
                    <TextBlock x:Name="LblProjectName" Foreground="#94A3B8" FontSize="12" FontWeight="SemiBold"/>
                    <TextBlock x:Name="ValProjectName" Foreground="White" Margin="0,10,0,0" TextWrapping="Wrap" FontSize="18" FontWeight="Bold"/>
                  </StackPanel>
                </Border>
                <Border Grid.Column="1" Background="#091121" BorderBrush="#233047" BorderThickness="1" CornerRadius="20" Padding="18" Margin="0,0,12,0">
                  <StackPanel>
                    <TextBlock x:Name="LblRepoRoot" Foreground="#94A3B8" FontSize="12" FontWeight="SemiBold"/>
                    <TextBlock x:Name="ValRepoRoot" Foreground="White" Margin="0,10,0,0" TextWrapping="Wrap"/>
                  </StackPanel>
                </Border>
                <Border Grid.Column="2" Background="#091121" BorderBrush="#233047" BorderThickness="1" CornerRadius="20" Padding="18">
                  <StackPanel>
                    <TextBlock x:Name="LblAppRoot" Foreground="#94A3B8" FontSize="12" FontWeight="SemiBold"/>
                    <TextBlock x:Name="ValAppRoot" Foreground="White" Margin="0,10,0,0" TextWrapping="Wrap"/>
                  </StackPanel>
                </Border>
              </Grid>

              <Grid>
                <Grid.ColumnDefinitions>
                  <ColumnDefinition Width="*"/>
                  <ColumnDefinition Width="*"/>
                  <ColumnDefinition Width="*"/>
                </Grid.ColumnDefinitions>
                <Border Grid.Column="0" Background="#0D1B18" BorderBrush="#1D4F45" BorderThickness="1" CornerRadius="20" Padding="18" Margin="0,0,12,0">
                  <StackPanel>
                    <TextBlock x:Name="LblLoadedVersion" Foreground="#99F6E4" FontSize="12" FontWeight="SemiBold"/>
                    <TextBlock x:Name="ValLoadedVersion" Foreground="White" Margin="0,10,0,0" FontSize="28" FontWeight="Bold"/>
                  </StackPanel>
                </Border>
                <Border Grid.Column="1" Background="#161226" BorderBrush="#3B2E67" BorderThickness="1" CornerRadius="20" Padding="18" Margin="0,0,12,0">
                  <StackPanel>
                    <TextBlock x:Name="LblLoadedDate" Foreground="#C4B5FD" FontSize="12" FontWeight="SemiBold"/>
                    <TextBlock x:Name="ValLoadedDate" Foreground="White" Margin="0,10,0,0" FontSize="18" FontWeight="Bold"/>
                  </StackPanel>
                </Border>
                <Border Grid.Column="2" Background="#111827" BorderBrush="#334155" BorderThickness="1" CornerRadius="20" Padding="18">
                  <StackPanel>
                    <TextBlock x:Name="LblRemoteVersion" Foreground="#93C5FD" FontSize="12" FontWeight="SemiBold"/>
                    <TextBlock x:Name="ValRemoteVersion" Foreground="White" Margin="0,10,0,0" FontSize="22" FontWeight="Bold"/>
                  </StackPanel>
                </Border>
              </Grid>
            </StackPanel>
          </Border>

          <Border Grid.Column="1" Style="{StaticResource CardStyle}" Margin="12,0,0,22">
            <StackPanel>
              <TextBlock x:Name="ReleaseCardTitle" FontSize="20" FontWeight="Bold" Foreground="White"/>
              <TextBlock x:Name="ReleaseCardHint" Margin="0,8,0,20" Foreground="#94A3B8" TextWrapping="Wrap"/>

              <Grid Margin="0,0,0,16">
                <Grid.ColumnDefinitions>
                  <ColumnDefinition Width="*"/>
                  <ColumnDefinition Width="*"/>
                </Grid.ColumnDefinitions>
                <StackPanel Grid.Column="0" Margin="0,0,12,0">
                  <TextBlock x:Name="LblVersion" Style="{StaticResource LabelStyle}"/>
                  <TextBox x:Name="TxtVersion" Style="{StaticResource InputStyle}"/>
                </StackPanel>
                <StackPanel Grid.Column="1">
                  <TextBlock x:Name="LblBuildDate" Style="{StaticResource LabelStyle}"/>
                  <TextBox x:Name="TxtBuildDate" Style="{StaticResource InputStyle}"/>
                </StackPanel>
              </Grid>

              <TextBlock x:Name="LblChangelog" Style="{StaticResource LabelStyle}"/>
              <TextBox x:Name="TxtChangelog" Style="{StaticResource InputStyle}" Height="250" AcceptsReturn="True" TextWrapping="Wrap" VerticalScrollBarVisibility="Auto"/>

              <Grid Margin="0,10,0,0">
                <Grid.ColumnDefinitions>
                  <ColumnDefinition Width="*"/>
                  <ColumnDefinition Width="*"/>
                  <ColumnDefinition Width="*"/>
                </Grid.ColumnDefinitions>
                <Button x:Name="BtnRefreshProject" Grid.Column="0" Style="{StaticResource SecondaryButtonStyle}" Margin="0,0,12,0" Height="50"/>
                <Button x:Name="BtnLoadVersion" Grid.Column="1" Style="{StaticResource SecondaryButtonStyle}" Margin="0,0,12,0" Height="50"/>
                <Button x:Name="BtnPublish" Grid.Column="2" Style="{StaticResource PrimaryButtonStyle}" Height="50"/>
              </Grid>
            </StackPanel>
          </Border>
        </Grid>

        <Border Style="{StaticResource CardStyle}" Margin="0,0,0,0">
          <StackPanel>
            <Grid>
              <Grid.ColumnDefinitions>
                <ColumnDefinition Width="*"/>
                <ColumnDefinition Width="Auto"/>
              </Grid.ColumnDefinitions>
              <StackPanel>
                <TextBlock x:Name="LogTitle" FontSize="20" FontWeight="Bold" Foreground="White"/>
                <TextBlock x:Name="LogHint" Margin="0,8,0,18" Foreground="#94A3B8" TextWrapping="Wrap"/>
              </StackPanel>
              <Border Grid.Column="1" Background="#0D1B18" BorderBrush="#1D4F45" BorderThickness="1" CornerRadius="999" Padding="16,8" VerticalAlignment="Top">
                <TextBlock x:Name="StatusChip" Foreground="#99F6E4" FontWeight="Bold"/>
              </Border>
            </Grid>
            <TextBox x:Name="TxtLog" Background="#091121" BorderBrush="#233047" BorderThickness="1" Foreground="#E2E8F0" Padding="14" Height="170" AcceptsReturn="True" TextWrapping="Wrap" VerticalScrollBarVisibility="Auto" IsReadOnly="True" FontFamily="Consolas"/>
          </StackPanel>
        </Border>
      </StackPanel>
    </ScrollViewer>
  </Grid>
</Window>
"@

$reader = New-Object System.Xml.XmlNodeReader $xaml
$window = [Windows.Markup.XamlReader]::Load($reader)

function Find-Control([string]$name) {
    return $window.FindName($name)
}

$AppTitle = Find-Control 'AppTitle'
$AppSubtitle = Find-Control 'AppSubtitle'
$BadgeProject = Find-Control 'BadgeProject'
$BadgeRelease = Find-Control 'BadgeRelease'
$BtnArabic = Find-Control 'BtnArabic'
$BtnEnglish = Find-Control 'BtnEnglish'
$ProjectCardTitle = Find-Control 'ProjectCardTitle'
$ProjectCardHint = Find-Control 'ProjectCardHint'
$LblProjectPath = Find-Control 'LblProjectPath'
$TxtProjectPath = Find-Control 'TxtProjectPath'
$BtnBrowse = Find-Control 'BtnBrowse'
$LblRepoUrl = Find-Control 'LblRepoUrl'
$TxtRepoUrl = Find-Control 'TxtRepoUrl'
$LblUsername = Find-Control 'LblUsername'
$TxtUsername = Find-Control 'TxtUsername'
$LblToken = Find-Control 'LblToken'
$TxtTokenPassword = Find-Control 'TxtTokenPassword'
$TxtTokenVisible = Find-Control 'TxtTokenVisible'
$BtnToggleToken = Find-Control 'BtnToggleToken'
$BtnSaveSettings = Find-Control 'BtnSaveSettings'
$StatusCardTitle = Find-Control 'StatusCardTitle'
$StatusCardHint = Find-Control 'StatusCardHint'
$LblProjectName = Find-Control 'LblProjectName'
$ValProjectName = Find-Control 'ValProjectName'
$LblRepoRoot = Find-Control 'LblRepoRoot'
$ValRepoRoot = Find-Control 'ValRepoRoot'
$LblAppRoot = Find-Control 'LblAppRoot'
$ValAppRoot = Find-Control 'ValAppRoot'
$LblLoadedVersion = Find-Control 'LblLoadedVersion'
$ValLoadedVersion = Find-Control 'ValLoadedVersion'
$LblLoadedDate = Find-Control 'LblLoadedDate'
$ValLoadedDate = Find-Control 'ValLoadedDate'
$LblRemoteVersion = Find-Control 'LblRemoteVersion'
$ValRemoteVersion = Find-Control 'ValRemoteVersion'
$ReleaseCardTitle = Find-Control 'ReleaseCardTitle'
$ReleaseCardHint = Find-Control 'ReleaseCardHint'
$LblVersion = Find-Control 'LblVersion'
$TxtVersion = Find-Control 'TxtVersion'
$LblBuildDate = Find-Control 'LblBuildDate'
$TxtBuildDate = Find-Control 'TxtBuildDate'
$LblChangelog = Find-Control 'LblChangelog'
$TxtChangelog = Find-Control 'TxtChangelog'
$BtnRefreshProject = Find-Control 'BtnRefreshProject'
$BtnLoadVersion = Find-Control 'BtnLoadVersion'
$BtnPublish = Find-Control 'BtnPublish'
$LogTitle = Find-Control 'LogTitle'
$LogHint = Find-Control 'LogHint'
$StatusChip = Find-Control 'StatusChip'
$txtLog = Find-Control 'TxtLog'

$folderDialog = New-Object System.Windows.Forms.FolderBrowserDialog
$folderDialog.Description = 'Choose the AI NetLink repo root or the ai-net-link folder directly.'
$folderDialog.ShowNewFolderButton = $false

$script:IsTokenVisible = $false
$script:CurrentContext = $null

function Get-TokenValue {
    if ($script:IsTokenVisible) {
        return $TxtTokenVisible.Text.Trim()
    }
    return $TxtTokenPassword.Password.Trim()
}

function Set-TokenValue([string]$value) {
    $TxtTokenPassword.Password = $value
    $TxtTokenVisible.Text = $value
}

function Set-CurrentContext([hashtable]$context, [hashtable]$versionData = $null) {
    $script:CurrentContext = $context
    $ValProjectName.Text = if ($context -and $context.ProjectName) { $context.ProjectName } else { Get-Text 'valueNotLoaded' }
    $ValRepoRoot.Text = if ($context) { $context.RepoRoot } else { Get-Text 'valueNotLoaded' }
    $ValAppRoot.Text = if ($context) { $context.AppRoot } else { Get-Text 'valueNotLoaded' }
    if ($versionData) {
        $ValLoadedVersion.Text = "v$($versionData.Version)"
        $ValLoadedDate.Text = if ($versionData.BuildDate) { $versionData.BuildDate } else { Get-Text 'valueNotLoaded' }
    } else {
        $ValLoadedVersion.Text = Get-Text 'valueNotLoaded'
        $ValLoadedDate.Text = Get-Text 'valueNotLoaded'
    }
    $ValRemoteVersion.Text = Get-Text 'valueNotLoaded'
}

function Set-BusyState([bool]$busy, [string]$statusKey) {
    foreach ($control in @($BtnBrowse, $BtnSaveSettings, $BtnRefreshProject, $BtnLoadVersion, $BtnPublish, $BtnToggleToken, $BtnArabic, $BtnEnglish)) {
        $control.IsEnabled = -not $busy
    }
    $StatusChip.Text = Get-Text $statusKey
}

function Apply-Language {
    $window.Title = Get-Text 'windowTitle'
    $window.FlowDirection = if ($script:CurrentLanguage -eq 'ar') { 'RightToLeft' } else { 'LeftToRight' }

    $AppTitle.Text = Get-Text 'appTitle'
    $AppSubtitle.Text = Get-Text 'appSubtitle'
    $BadgeProject.Text = Get-Text 'badgeProject'
    $BadgeRelease.Text = Get-Text 'badgeRelease'
    $BtnArabic.Content = Get-Text 'languageArabic'
    $BtnEnglish.Content = Get-Text 'languageEnglish'
    $ProjectCardTitle.Text = Get-Text 'projectCardTitle'
    $ProjectCardHint.Text = Get-Text 'projectCardHint'
    $LblProjectPath.Text = Get-Text 'projectPath'
    $BtnBrowse.Content = Get-Text 'browse'
    $LblRepoUrl.Text = Get-Text 'repoUrl'
    $LblUsername.Text = Get-Text 'username'
    $LblToken.Text = Get-Text 'token'
    $BtnToggleToken.Content = if ($script:IsTokenVisible) { Get-Text 'hideToken' } else { Get-Text 'showToken' }
    $BtnSaveSettings.Content = Get-Text 'saveSettings'
    $StatusCardTitle.Text = Get-Text 'statusCardTitle'
    $StatusCardHint.Text = Get-Text 'statusCardHint'
    $LblProjectName.Text = Get-Text 'projectName'
    $LblRepoRoot.Text = Get-Text 'repoRoot'
    $LblAppRoot.Text = Get-Text 'appRoot'
    $LblLoadedVersion.Text = Get-Text 'loadedVersion'
    $LblLoadedDate.Text = Get-Text 'loadedDate'
    $LblRemoteVersion.Text = Get-Text 'remoteVersion'
    $ReleaseCardTitle.Text = Get-Text 'releaseCardTitle'
    $ReleaseCardHint.Text = Get-Text 'releaseCardHint'
    $LblVersion.Text = Get-Text 'version'
    $LblBuildDate.Text = Get-Text 'buildDate'
    $LblChangelog.Text = Get-Text 'changelog'
    $BtnRefreshProject.Content = Get-Text 'refreshProject'
    $BtnLoadVersion.Content = Get-Text 'loadVersion'
    $BtnPublish.Content = Get-Text 'publish'
    $LogTitle.Text = Get-Text 'logTitle'
    $LogHint.Text = Get-Text 'logHint'
    if ($StatusChip.Text -eq '') { $StatusChip.Text = Get-Text 'statusReady' }

    $TxtProjectPath.FlowDirection = 'LeftToRight'
    $TxtRepoUrl.FlowDirection = 'LeftToRight'
    $TxtUsername.FlowDirection = 'LeftToRight'
    $TxtTokenPassword.FlowDirection = 'LeftToRight'
    $TxtTokenVisible.FlowDirection = 'LeftToRight'
    $TxtVersion.FlowDirection = 'LeftToRight'
    $TxtBuildDate.FlowDirection = 'LeftToRight'
}

function Sync-VisibleToken {
    if ($script:IsTokenVisible) {
        $TxtTokenVisible.Text = $TxtTokenPassword.Password
    } else {
        $TxtTokenPassword.Password = $TxtTokenVisible.Text
    }
}

function Load-VersionIntoUi {
    $context = Resolve-ProjectContext $TxtProjectPath.Text
    $versionData = Load-VersionData $context.VersionPath
    $TxtVersion.Text = $versionData.Version
    $TxtBuildDate.Text = if ($versionData.BuildDate) { $versionData.BuildDate } else { Get-Date -Format 'yyyy-MM-dd' }
    $TxtChangelog.Text = ($versionData.Changelog -join [Environment]::NewLine)
    Set-CurrentContext $context $versionData
    try {
        $remoteVersion = Get-RemoteVersionData $TxtRepoUrl.Text (Get-TokenValue)
        $ValRemoteVersion.Text = if ($remoteVersion.version) { "v$($remoteVersion.version)" } else { Get-Text 'valueNotLoaded' }
    } catch {
        $ValRemoteVersion.Text = Get-Text 'remoteUnavailable'
    }
    Write-Log (Get-Text 'logVersionLoaded')
}

function Save-VersionDraftFromInputs {
    $context = Resolve-ProjectContext $TxtProjectPath.Text
    $version = $TxtVersion.Text.Trim()
    $buildDate = $TxtBuildDate.Text.Trim()
    $changelog = @($TxtChangelog.Text -split "(\r?\n)+" | Where-Object { $_ -and $_.Trim() -ne '' } | ForEach-Object { $_.Trim() })

    if (-not $version -or -not $buildDate -or $changelog.Count -eq 0) {
        return
    }

    Save-VersionData $context.VersionPath $version $buildDate $changelog
    Set-CurrentContext $context @{
        Version = $version
        BuildDate = $buildDate
        Changelog = $changelog
    }
    Write-Log (Get-Text 'logDraftSaved')
}

$BtnArabic.Add_Click({
    $script:CurrentLanguage = 'ar'
    Apply-Language
})

$BtnEnglish.Add_Click({
    $script:CurrentLanguage = 'en'
    Apply-Language
})

$BtnToggleToken.Add_Click({
    if ($script:IsTokenVisible) {
        $TxtTokenPassword.Password = $TxtTokenVisible.Text
        $TxtTokenVisible.Visibility = 'Collapsed'
        $TxtTokenPassword.Visibility = 'Visible'
        $script:IsTokenVisible = $false
    } else {
        $TxtTokenVisible.Text = $TxtTokenPassword.Password
        $TxtTokenPassword.Visibility = 'Collapsed'
        $TxtTokenVisible.Visibility = 'Visible'
        $script:IsTokenVisible = $true
    }
    Apply-Language
})

$BtnBrowse.Add_Click({
    if ($folderDialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        $TxtProjectPath.Text = $folderDialog.SelectedPath
        try {
            Load-VersionIntoUi
        } catch {
            Set-CurrentContext $null $null
            Write-Log $_.Exception.Message
        }
    }
})

$TxtProjectPath.Add_LostFocus({
    try {
        if ($TxtProjectPath.Text.Trim()) {
            Load-VersionIntoUi
        }
    } catch {
        Set-CurrentContext $null $null
    }
})

$BtnSaveSettings.Add_Click({
    try {
        Save-PublisherConfig @{
            ProjectPath = $TxtProjectPath.Text.Trim()
            RepoUrl = $TxtRepoUrl.Text.Trim()
            Username = $TxtUsername.Text.Trim()
            Token = Get-TokenValue
        }
        Write-Log (Get-Text 'logSettingsSaved')
        [System.Windows.MessageBox]::Show((Get-Text 'settingsSavedBody'), (Get-Text 'settingsSavedTitle'))
    } catch {
        [System.Windows.MessageBox]::Show($_.Exception.Message, (Get-Text 'genericErrorTitle'))
    }
})

$BtnLoadVersion.Add_Click({
    try {
        Load-VersionIntoUi
    } catch {
        [System.Windows.MessageBox]::Show($_.Exception.Message, (Get-Text 'genericErrorTitle'))
    }
})

$BtnRefreshProject.Add_Click({
    try {
        Load-VersionIntoUi
        Write-Log (Get-Text 'logProjectRefreshed')
    } catch {
        [System.Windows.MessageBox]::Show($_.Exception.Message, (Get-Text 'genericErrorTitle'))
    }
})

$TxtVersion.Add_LostFocus({
    try {
        Save-VersionDraftFromInputs
    } catch {
        Write-Log $_.Exception.Message
    }
})

$TxtBuildDate.Add_LostFocus({
    try {
        Save-VersionDraftFromInputs
    } catch {
        Write-Log $_.Exception.Message
    }
})

$TxtChangelog.Add_LostFocus({
    try {
        Save-VersionDraftFromInputs
    } catch {
        Write-Log $_.Exception.Message
    }
})

$BtnPublish.Add_Click({
    try {
        $version = $TxtVersion.Text.Trim()
        $buildDate = $TxtBuildDate.Text.Trim()
        $changelog = @($TxtChangelog.Text -split "(\r?\n)+" | Where-Object { $_ -and $_.Trim() -ne '' } | ForEach-Object { $_.Trim() })

        if (-not $version) { throw (Get-Text 'errVersionRequired') }
        if (-not $buildDate) { throw (Get-Text 'errBuildDateRequired') }
        if ($changelog.Count -eq 0) { throw (Get-Text 'errChangelogRequired') }

        Set-BusyState $true 'statusPublishing'

        $context = Resolve-ProjectContext $TxtProjectPath.Text
        $authenticatedUrl = Build-AuthenticatedUrl $TxtRepoUrl.Text (Get-TokenValue)
        $remoteVersion = Get-RemoteVersionData $TxtRepoUrl.Text (Get-TokenValue)

        if ($remoteVersion.version -eq $version) {
            throw (Get-Text 'errVersionMustChange')
        }

        Write-Log (Get-Text 'logPulling')
        $pull = Invoke-Git ("pull --rebase --autostash {0} main" -f (Quote-GitArgument $authenticatedUrl)) $context.RepoRoot
        if ($pull.ExitCode -ne 0) { throw ("{0}`r`n{1}" -f (Get-Text 'errGitPullFailed'), $pull.Output) }

        Save-VersionData $context.VersionPath $version $buildDate $changelog
        Write-Log (Get-Text 'logVersionUpdated')

        foreach ($command in @(
            'config user.email "admin@aljabareen.com"',
            'config user.name "NetLink Windows Publisher"',
            'config core.longpaths true',
            'add -A .',
            'reset -q -- "NetLink Enterprise DB" "AI NetLink Interface/ai-net-link/git_config.json" "AI NetLink Interface/ai-net-link/.wwebjs_cache"'
        )) {
            $result = Invoke-Git $command $context.RepoRoot
            if ($result.ExitCode -ne 0) {
                throw ("{0}`r`n{1}" -f (Get-Text 'errGitCommandFailed'), $result.Output)
            }
        }

        $commit = Invoke-Git ("commit -m {0}" -f (Quote-GitArgument ("release: v{0}" -f $version))) $context.RepoRoot
        if ($commit.ExitCode -ne 0 -and $commit.Output -notmatch 'nothing to commit|no changes added') {
            throw ("{0}`r`n{1}" -f (Get-Text 'errGitCommitFailed'), $commit.Output)
        }

        Write-Log (Get-Text 'logPublishing')
        $push = Invoke-Git ("push {0} HEAD:main" -f (Quote-GitArgument $authenticatedUrl)) $context.RepoRoot
        if ($push.ExitCode -ne 0) {
            throw ("{0}`r`n{1}" -f (Get-Text 'errGitPushFailed'), $push.Output)
        }

        Save-PublisherConfig @{
            ProjectPath = $TxtProjectPath.Text.Trim()
            RepoUrl = $TxtRepoUrl.Text.Trim()
            Username = $TxtUsername.Text.Trim()
            Token = Get-TokenValue
        }

        Set-CurrentContext $context @{
            Version = $version
            BuildDate = $buildDate
            Changelog = $changelog
        }
        $ValRemoteVersion.Text = "v$version"

        Write-Log (Get-Text 'logPublished')
        Set-BusyState $false 'statusReady'
        [System.Windows.MessageBox]::Show(((Get-Text 'publishSuccessBody') -f $version), (Get-Text 'publishSuccessTitle'))
    } catch {
        Set-BusyState $false 'statusError'
        Write-Log $_.Exception.Message
        [System.Windows.MessageBox]::Show($_.Exception.Message, (Get-Text 'publishErrorTitle'))
    }
})

$TxtTokenPassword.Add_PasswordChanged({
    if (-not $script:IsTokenVisible) {
        $TxtTokenVisible.Text = $TxtTokenPassword.Password
    }
})

$TxtTokenVisible.Add_TextChanged({
    if ($script:IsTokenVisible) {
        $TxtTokenPassword.Password = $TxtTokenVisible.Text
    }
})

$TxtProjectPath.Text = $config.ProjectPath
$TxtRepoUrl.Text = $config.RepoUrl
$TxtUsername.Text = $config.Username
Set-TokenValue $config.Token
$TxtBuildDate.Text = Get-Date -Format 'yyyy-MM-dd'

Apply-Language
Set-BusyState $false 'statusReady'

try {
    Load-VersionIntoUi
    Write-Log (Get-Text 'logReady')
} catch {
    Set-CurrentContext $null $null
    Write-Log (Get-Text 'logSelectProject')
}

[void]$window.ShowDialog()
