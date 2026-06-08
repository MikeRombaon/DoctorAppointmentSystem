# ─────────────────────────────────────────────
# Stage 1 — Build React frontend
# ─────────────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app/client

COPY DoctorAppointmentSystem.client/package*.json ./
RUN npm ci --silent

COPY DoctorAppointmentSystem.client/ ./

# Tell vite.config.js to skip dev-cert logic
ENV DOCKER_BUILD=true

RUN npm run build
# Output: /app/client/dist


# ─────────────────────────────────────────────
# Stage 2 — Build .NET 10 API
# ─────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api-build

WORKDIR /src

# Copy solution & project files first (better layer caching)
COPY *.sln ./
COPY DoctorAppointmentSystem.Domain/DoctorAppointmentSystem.Domain.csproj         DoctorAppointmentSystem.Domain/
COPY DoctorAppointmentSystem.Data/DoctorAppointmentSystem.Data.csproj             DoctorAppointmentSystem.Data/
COPY DoctorAppointmentSystem.Repositories/DoctorAppointmentSystem.Repositories.csproj DoctorAppointmentSystem.Repositories/
COPY DoctorAppointmentSystem.API/DoctorAppointmentSystem.API.csproj               DoctorAppointmentSystem.API/
COPY DoctorAppointmentSystem.Server/DoctorAppointmentSystem.Server.csproj         DoctorAppointmentSystem.Server/

RUN dotnet restore DoctorAppointmentSystem.API/DoctorAppointmentSystem.API.csproj --locked-mode 2>/dev/null || dotnet restore DoctorAppointmentSystem.API/DoctorAppointmentSystem.API.csproj

# Copy full source
COPY DoctorAppointmentSystem.Domain/     DoctorAppointmentSystem.Domain/
COPY DoctorAppointmentSystem.Data/       DoctorAppointmentSystem.Data/
COPY DoctorAppointmentSystem.Repositories/ DoctorAppointmentSystem.Repositories/
COPY DoctorAppointmentSystem.API/        DoctorAppointmentSystem.API/
COPY DoctorAppointmentSystem.Server/     DoctorAppointmentSystem.Server/

RUN dotnet publish DoctorAppointmentSystem.API/DoctorAppointmentSystem.API.csproj \
	-c Release \
	-o /app/publish


# ─────────────────────────────────────────────
# Stage 3 — Runtime image
# ─────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime

WORKDIR /app

# Copy published API
COPY --from=api-build /app/publish ./

# Copy React build into wwwroot so ASP.NET Core static files serve it
COPY --from=frontend-build /app/client/dist ./wwwroot/

# Ensure uploads directory exists
RUN mkdir -p wwwroot/uploads

ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:8080

EXPOSE 8080

ENTRYPOINT ["dotnet", "DoctorAppointmentSystem.API.dll"]
