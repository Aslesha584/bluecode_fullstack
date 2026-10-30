
import founderLogo from "../assets/founder-logo.png";
import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Link2,
  ShieldCheck,
  LoaderCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePrototype } from "../context/PrototypeContext";
import { Button } from "../components/UI";

export default function BookingSetup() {
  const navigate = useNavigate();

  const {
    bookingUrl,
    updateBookingUrl,
    startup,
    discoverProspects,
    discoveryStatus
  } = usePrototype();

  const [link, setLink] = useState(bookingUrl || "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);

  const validate = value => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !!url.hostname;
    } catch {
      return false;
    }
  };

  const submit = async e => {
    e.preventDefault();

    const trimmedLink = link.trim();

    if (!validate(trimmedLink)) {
      setError(
        "Enter a complete secure URL beginning with https://"
      );
      return;
    }

    setError("");
    setSaved(false);

    // Save the booking URL first.
    updateBookingUrl(trimmedLink);
    setSaved(true);
    setIsDiscovering(true);

    try {
      // Automatically discover companies using the approved ICP.
      await discoverProspects();

      // Open dashboard after successful discovery.
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.message ||
        "Company discovery failed. Please check your Hunter API configuration and try again."
      );
    } finally {
      setIsDiscovering(false);
    }
  };

  return (
    <div className="booking-setup-page">
      <div className="setup-top">
        <a className="brand" href="/login">
          <div className="brand-mark">
            <img
              src={founderLogo}
              alt="Blue Code - OS logo"
            />
          </div>

          <div>
            <strong>Blue Code - OS</strong>
            <span>Meeting setup</span>
          </div>
        </a>

        <span className="step-count">
          REQUIRED SETUP
        </span>
      </div>

      <div className="setup-progress">
        <span style={{ width: "100%" }} />
      </div>

      <div className="setup-container">
        <div className="setup-step-kicker">
          <span>04</span> MEETING BOOKING
        </div>

        <h1>
          Let interested prospects book a conversation.
        </h1>

        <p className="setup-intro">
          Add your Calendly, Cal.com or another secure booking link.
          Blue Code - OS can use it in future meeting suggestions.
          You can change it later in Settings.
        </p>

        <div className="booking-setup-card">
          <div className="booking-illustration">
            <CalendarDays size={27} />
          </div>

          <h2>Set up your booking link</h2>

          <p>
            Save your booking URL so interested prospects can request a meeting.
          </p>

          <form onSubmit={submit}>
            <label
              className="field-label"
              htmlFor="booking-url"
            >
              Booking URL
            </label>

            <div className="input-with-icon">
              <Link2 size={17} />

              <input
                id="booking-url"
                className="input"
                type="url"
                value={link}
                onChange={e => {
                  setLink(e.target.value);
                  setError("");
                }}
                placeholder="https://calendly.com/your-name/intro"
                required
                disabled={isDiscovering}
              />
            </div>

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            <div className="form-note">
              <ShieldCheck size={16} />
              Your booking URL is saved to your workspace.
              Calendar integration is not connected yet.
            </div>

            <Button
              type="submit"
              icon={isDiscovering ? LoaderCircle : ArrowRight}
              className="button-full"
              disabled={isDiscovering}
            >
              {isDiscovering
                ? "Discovering companies..."
                : "Save and open dashboard"}
            </Button>
          </form>

          {saved && !error && (
            <p className="booking-saved">
              <CheckCircle2 size={16} />
              Booking link saved.
            </p>
          )}

          {isDiscovering && (
            <p className="form-note">
              <LoaderCircle size={16} />
              Finding companies that match your approved ICP.
              This may take a few moments.
            </p>
          )}

          {discoveryStatus === "completed" && !isDiscovering && (
            <p className="booking-saved">
              <CheckCircle2 size={16} />
              Company discovery completed.
            </p>
          )}
        </div>

        <p className="privacy-note">
          {startup.companyName
            ? `Workspace: ${startup.companyName}`
            : "Founder workspace"}{" "}
          · Your workspace data is saved to your account.
        </p>
      </div>
    </div>
  );
}
