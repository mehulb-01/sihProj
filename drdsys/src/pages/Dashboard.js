import React, { useState } from "react";
import styled from "styled-components";
import { CSVLink } from "react-csv";
import { Bar, Pie } from "react-chartjs-2";
import Button from "../components/Button";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const Dashboard = () => {
  const [attendanceFile, setAttendanceFile] = useState(null);
  const [marksFile, setMarksFile] = useState(null);
  const [feesFile, setFeesFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [analysisRecords, setAnalysisRecords] = useState([]);
  const [chartType, setChartType] = useState("bar");
  const [filterRisk, setFilterRisk] = useState("all");

  const recordsWithParentEmails = analysisRecords.map((rec) => ({
    ...rec,
    parent_email: rec.parent_email || "parent@example.com", // Example email placeholder
  }));

  const onFileDrop = (setter) => (event) => {
    event.preventDefault();
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      setter(event.dataTransfer.files[0]);
      event.dataTransfer.clearData();
    }
  };

  const onFileChange = (setter) => (event) => {
    if (event.target.files && event.target.files.length > 0) {
      setter(event.target.files[0]);
    }
  };

  const onDragOver = (event) => {
    event.preventDefault();
  };

  const handleRemoveFile = (setter) => {
    setter(null);
  };

  const fetchAnalysis = async () => {
    try {
      const response = await fetch("http://localhost:8000/analyze");
      const data = await response.json();
      if (response.ok) {
        setAnalysisRecords(data.records);
      } else {
        setUploadStatus("Analysis failed: " + data.detail);
      }
    } catch {
      setUploadStatus("Network error during analysis");
    }
  };

  const handleUpload = async () => {
    if (!attendanceFile || !marksFile || !feesFile) {
      setUploadStatus("Please upload all three files.");
      return;
    }
    setUploadStatus("Uploading files...");
    setAnalysisRecords([]);
    const formData = new FormData();
    formData.append("attendance", attendanceFile);
    formData.append("marks", marksFile);
    formData.append("fees", feesFile);

    try {
      const response = await fetch("http://localhost:8000/upload-files", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        setUploadStatus("Files uploaded successfully. Fetching analysis...");
        await fetchAnalysis();
      } else {
        setUploadStatus("Upload failed: " + (data.detail || "Unknown error"));
      }
    } catch (err) {
      setUploadStatus("Network error during upload");
    }
  };

  const countRisks = () => {
    const counts = { High: 0, Medium: 0, Low: 0 };
    analysisRecords.forEach((rec) => {
      counts[rec.risk] = counts[rec.risk] ? counts[rec.risk] + 1 : 1;
    });
    return counts;
  };

  const riskCounts = countRisks();

  const barData = {
    labels: ["High", "Medium", "Low"],
    datasets: [
      {
        label: "# of Students",
        data: [riskCounts.High || 0, riskCounts.Medium || 0, riskCounts.Low || 0],
        backgroundColor: ["#a83232", "#ad8d1a", "#2f6627"],
      },
    ],
  };

  const pieData = {
    labels: ["High", "Medium", "Low"],
    datasets: [
      {
        label: "Risk distribution",
        data: [riskCounts.High || 0, riskCounts.Medium || 0, riskCounts.Low || 0],
        backgroundColor: ["#a83232", "#ad8d1a", "#2f6627"],
        hoverOffset: 30,
      },
    ],
  };

  const filteredRecords = recordsWithParentEmails.filter((rec) =>
    filterRisk === "all" ? true : rec.risk === filterRisk
  );

  const generateParentEmailBody = (student) => {
    return `Dear Parent,

We wanted to update you about your child, ${student.name}.
Current attendance is ${student.attendance}%.
Marks trend is ${student.marks_trend}.
Pending fees: $${student.fees_due}.

Please contact the school for further details.

Thank you.`;
  };

  const sendMailToParents = () => {
    const highRiskStudents = recordsWithParentEmails.filter((rec) => rec.risk === "High");
    if (highRiskStudents.length === 0) {
      alert("No high risk students to send mail.");
      return;
    }
    highRiskStudents.forEach((student) => {
      const mailtoLink = `mailto:${student.parent_email}?subject=Update on Your Child&body=${encodeURIComponent(generateParentEmailBody(student))}`;
      window.open(mailtoLink, "_blank");
    });
  };

  const sendMailToMentors = () => {
    alert("Send mail to mentors clicked - implement your logic here.");
  };

  return (
    <StyledDashboard>
      <h1>Student Risk Analysis Dashboard</h1>
      <UploadSection>
        <UploadCard
          file={attendanceFile}
          label="Attendance CSV"
          onDrop={onFileDrop(setAttendanceFile)}
          onDragOver={onDragOver}
          onFileChange={onFileChange(setAttendanceFile)}
          onRemove={() => handleRemoveFile(setAttendanceFile)}
        />
        <UploadCard
          file={marksFile}
          label="Marks CSV"
          onDrop={onFileDrop(setMarksFile)}
          onDragOver={onDragOver}
          onFileChange={onFileChange(setMarksFile)}
          onRemove={() => handleRemoveFile(setMarksFile)}
        />
        <UploadCard
          file={feesFile}
          label="Fees CSV"
          onDrop={onFileDrop(setFeesFile)}
          onDragOver={onDragOver}
          onFileChange={onFileChange(setFeesFile)}
          onRemove={() => handleRemoveFile(setFeesFile)}
        />
      </UploadSection>
      <ButtonWrapper>
        <Button onClick={handleUpload}>Upload and Analyze</Button>
        {analysisRecords.length > 0 && (
          <CSVLink data={analysisRecords} filename={"risk_analysis.csv"}>
          </CSVLink>
        )}
      </ButtonWrapper>
      <StatusMessage>{uploadStatus}</StatusMessage>

      {analysisRecords.length > 0 && (
        <>
          <ChartSelector>
            <label>
              <input
                type="radio"
                value="bar"
                checked={chartType === "bar"}
                onChange={() => setChartType("bar")}
              />
              Bar Chart
            </label>
            <label>
              <input
                type="radio"
                value="pie"
                checked={chartType === "pie"}
                onChange={() => setChartType("pie")}
              />
              Pie Chart
            </label>
          </ChartSelector>

          <ResultsWrapper>
            <ChartContainer>
              {chartType === "bar" ? (
                <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false }} />
              ) : (
                <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: false }} />
              )}
            </ChartContainer>

            <TableAndActionsWrapper>
              <AnalysisTableContainer>
                <FilterSelector>
                  <label>
                    <input
                      type="radio"
                      name="filterRisk"
                      value="all"
                      checked={filterRisk === "all"}
                      onChange={() => setFilterRisk("all")}
                    />
                    All Risks
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="filterRisk"
                      value="Low"
                      checked={filterRisk === "Low"}
                      onChange={() => setFilterRisk("Low")}
                    />
                    Low
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="filterRisk"
                      value="Medium"
                      checked={filterRisk === "Medium"}
                      onChange={() => setFilterRisk("Medium")}
                    />
                    Medium
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="filterRisk"
                      value="High"
                      checked={filterRisk === "High"}
                      onChange={() => setFilterRisk("High")}
                    />
                    High
                  </label>
                </FilterSelector>
                <AnalysisTable>
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Name</th>
                      <th>Attendance</th>
                      <th>Marks Trend</th>
                      <th>Fees Due</th>
                      <th>Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((rec, idx) => {
                      const riskClass =
                        rec.risk === "High"
                          ? "high-risk"
                          : rec.risk === "Medium"
                          ? "medium-risk"
                          : "low-risk";
                      return (
                        <tr key={idx} className={riskClass}>
                          <td>{rec.student_id || "N/A"}</td>
                          <td>{rec.name || "N/A"}</td>
                          <td>{rec.attendance ?? "N/A"}</td>
                          <td>{rec.marks_trend || "N/A"}</td>
                          <td>{rec.fees_due ?? "N/A"}</td>
                          <td>{rec.risk || "N/A"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </AnalysisTable>
              </AnalysisTableContainer>

              <ActionButtons>
                <Button>
                  <CSVLink
                    data={analysisRecords}
                    filename={"risk_analysis.csv"}
                    passHref
                  >
                    <DownloadLink as="a">Download CSV</DownloadLink>
                  </CSVLink>
                </Button>
                {filterRisk === "Medium" && (
                  <Button onClick={sendMailToMentors}>
                    Send Mail to Mentors
                  </Button>
                )}
                {filterRisk === "High" && (
                  <Button onClick={sendMailToParents}>
                    Send Mail to Parents
                  </Button>
                )}
              </ActionButtons>
            </TableAndActionsWrapper>
          </ResultsWrapper>
        </>
      )}
    </StyledDashboard>
  );
};

const UploadCard = ({
  file,
  label,
  onDrop,
  onDragOver,
  onFileChange,
  onRemove,
}) => {
  return (
    <CardWrapper
      onDrop={onDrop}
      onDragOver={onDragOver}
      tabIndex={0}
      aria-label={`Upload ${label}`}
    >
      <div className="header">
        <h3>Upload Files</h3>
        <p>Drag & drop your files here</p>
      </div>
      <div className="icon-container">
        <svg
          className="icon"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
          focusable="false"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      </div>
      <input
        type="file"
        accept=".csv"
        onChange={onFileChange}
        className="file-input"
      />
      <div className="upload-info">
        {file ? (
          <>
            <p className="filename">{file.name}</p>
            <p className="filesize">{(file.size / 1024).toFixed(2)} KB</p>
            <RemoveButton
              type="button"
              aria-label={`Remove ${label}`}
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="trash-icon"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                width={20}
                height={20}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4m-4 0a1 1 0 00-1 1v1h6V4a1 1 0 00-1-1m-4 0h4"
                />
              </svg>
            </RemoveButton>
          </>
        ) : (
          <>
            <p className="instruction">Drop your files here or browse</p>
            <p className="support">Support files: CSV</p>
            <p className="max-size">Max file size: 10MB</p>
          </>
        )}
      </div>
    </CardWrapper>
  );
};

const StyledDashboard = styled.div`
  color: #d3d3d3;
  background: #0f0f0f;
  min-height: 100vh;
  padding: 2rem;
  font-family: "Times New Roman", Times, serif;
  text-align: center;

  h1 {
    margin-bottom: 2rem;
    color: #00ff75;
  }
`;

const UploadSection = styled.div`
  display: flex;
  justify-content: center;
  gap: 2rem;
  flex-wrap: wrap;
`;

const CardWrapper = styled.div`
  position: relative;
  background-color: #171717;
  border-radius: 24px;
  width: 420px;
  height: 240px;
  border: 2px dashed #00ff75;
  cursor: pointer;
  color: #a0a0a0;
  transition: background-color 0.3s ease, border-color 0.3s ease;

  &:hover,
  &:focus {
    background-color: #252525;
    border-color: #00ff75;
    color: #00ff75;
    outline: none;
  }

  .header {
    padding: 1.5rem;
    text-align: left;

    h3 {
      margin: 0;
      font-size: 1.3rem;
      color: white;
    }

    p {
      margin: 0.3rem 0 0 0;
      font-size: 0.9rem;
    }
  }

  .icon-container {
    position: absolute;
    top: 1.5rem;
    right: 1.5rem;
  }

  .icon {
    width: 36px;
    height: 36px;
    stroke: #00ff75;
  }

  .file-input {
    position: absolute;
    top: 0;
    left: 0;
    opacity: 0;
    height: 100%;
    width: 100%;
    cursor: pointer;
  }

  .upload-info {
    position: relative;
    bottom: 1.5rem;
    left: 1.5rem;
    right: 1.5rem;
    text-align: left;
  }

  .filename {
    padding-right: 3.3rem;
    font-weight: 600;
    font-size: 1rem;
    color: white;
    margin-bottom: 0.3rem;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .filesize,
  .support,
  .max-size,
  .instruction {
    font-size: 0.85rem;
    color: #a0a0a0;
    margin: 0.1rem 0;
  }
`;

const RemoveButton = styled.button`
  position: absolute;
  top: 50%;
  right: 3.3rem;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #ff4444;
  font-size: 1.2rem;
  cursor: pointer;
  user-select: none;
  line-height: 1;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;

  &:hover,
  &:focus {
    color: #ff0000;
    outline: none;
  }
`;

const ButtonWrapper = styled.div`
  margin-top: 1.5rem;
`;

const DownloadLink = styled.a`
  color: black;
  text-decoration: none;
  display: inline-block;
  width: 100%;
  text-align: center;

  &:hover {
    color: white;
    text-decoration: none;
  }
`;

const StatusMessage = styled.p`
  margin-top: 1rem;
  font-size: 1rem;
  color: #d3d3d3;
`;

const ChartSelector = styled.div`
  margin: 1rem 0 0.5rem 0;
  color: #d3d3d3;
  font-family: "Times New Roman", Times, serif;

  label {
    margin-right: 1.5rem;
    cursor: pointer;
    user-select: none;
  }

  input[type="radio"] {
    margin-right: 0.5rem;
  }
`;

const ResultsWrapper = styled.div`
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-top: 2rem;
  width: 90%;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
  align-items: flex-start;
`;

const ChartContainer = styled.div`
  width: 50%;
  height: 440px;
  background: #171717;
  border-radius: 16px;
  padding: 1rem;
`;

const TableAndActionsWrapper = styled.div`
  width: 50%;
  min-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
`;

const AnalysisTableContainer = styled.div`
  width: 100%;
  max-height: 400px;
  overflow-y: auto;
  border-radius: 12px;
  border: 1px solid #000000ff;
  background-color: #121212;

  &::-webkit-scrollbar {
    width: 10px;
    background-color: #333;
  }
  &::-webkit-scrollbar-thumb {
    background-color: #777;
    border-radius: 6px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background-color: #555;
  }

  scrollbar-width: thin;
  scrollbar-color: #777 #333;
`;

const AnalysisTable = styled.table`
  border-collapse: collapse;
  width: 100%;
  font-size: 0.85rem;
  color: #d3d3d3;
  font-family: "Times New Roman", Times, serif;

  th,
  td {
    border: 1px solid #000000ff;
    padding: 0.5rem 0.8rem;
    text-align: center;
  }

  thead {
    background-color: #171717;
  }

  thead th {
    position: sticky;
    top: 0;
    background-color: #171717;
    z-index: 10;
  }

  tr.high-risk {
    background-color: #a83232 !important;
    color: #ffffff;
  }

  tr.medium-risk {
    background-color: #ad8d1a !important;
    color: #222222;
  }

  tr.low-risk {
    background-color: #2f6627 !important;
    color: #ffffff;
  }
`;

const FilterSelector = styled.div`
  margin: 1rem 0;
  color: #d3d3d3;
  font-family: "Times New Roman", Times, serif;
  text-align: center;

  label {
    margin-right: 1.5rem;
    cursor: pointer;
    user-select: none;
  }

  input[type="radio"] {
    margin-right: 0.5rem;
  }
`;

const ActionButtons = styled.div`
  margin-top: 18px;
  display: flex;
  gap: 1rem;
  justify-content: center;
  padding-left: 8px;
`;

export default Dashboard;
