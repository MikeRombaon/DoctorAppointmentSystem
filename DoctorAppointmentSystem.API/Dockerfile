# ── Stage 1: Build React frontend ────────────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app/client

COPY dentalinformationsystem.client/package*.json ./
RUN npm ci --prefer-offline

ENV DOCKER_BUILD=true
COPY dentalinformationsystem.client/ ./
RUN npm run build

# ── Stage 2: Build .NET 10 backend ───────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY DentalInformationSystem.API/DentalInformationSystem.API.csproj               DentalInformationSystem.API/
COPY DentalInformationSystem.Data/DentalInformationSystem.Data.csproj             DentalInformationSystem.Data/
COPY DentalInformationSystem.Domain/DentalInformationSystem.Domain.csproj         DentalInformationSystem.Domain/
COPY DentalInformationSystem.Repositories/DentalInformationSystem.Repositories.csproj DentalInformationSystem.Repositories/
COPY DentalInformationSystem.Server/DentalInformationSystem.Server.csproj         DentalInformationSystem.Server/

RUN dotnet restore DentalInformationSystem.API/DentalInformationSystem.API.csproj

COPY DentalInformationSystem.API/          DentalInformationSystem.API/
COPY DentalInformationSystem.Data/         DentalInformationSystem.Data/
COPY DentalInformationSystem.Domain/       DentalInformationSystem.Domain/
COPY DentalInformationSystem.Repositories/ DentalInformationSystem.Repositories/
COPY DentalInformationSystem.Server/       DentalInformationSystem.Server/

RUN dotnet publish DentalInformationSystem.API/DentalInformationSystem.API.csproj \
    -c Release -o /app/publish --no-restore

# Embed the React build into the published wwwroot
COPY --from=frontend-build /app/client/dist /app/publish/wwwroot

# ── Stage 3: Runtime image ────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 dental && \
    useradd  --system --uid 1001 --gid dental dental

COPY --from=build /app/publish .

RUN mkdir -p /app/wwwroot/uploads && chown -R dental:dental /app

USER dental

EXPOSE 8080

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "DentalInformationSystem.API.dll"]
