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
    const [mailProvider, setMailProvider] = useState("gmail");

    const recordsWithParentEmails = analysisRecords.map((rec) => ({
        ...rec,
        parent_email: rec.parent_email || "parent@example.com",
        mentor_email: rec.mentor_email || "mentor@example.com",
    }));

    const onDropHandler = (setter) => (event) => {
        event.preventDefault();
        if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
            setter(event.dataTransfer.files[0]);
            event.dataTransfer.clearData();
        }
    };

    const onChangeHandler = (setter) => (event) => {
        if (event.target.files && event.target.files.length > 0) {
            setter(event.target.files[0]);
        }
    };

    const onDragOverHandler = (event) => {
        event.preventDefault();
    };

    const removeFileHandler = (setter) => {
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
        labels: ['High', 'Medium', 'Low'],
        datasets: [{
            label: "# of Students",
            data: [riskCounts.High || 0, riskCounts.Medium || 0, riskCounts.Low || 0],
            backgroundColor: ['#ff4c4c', '#ffd700', '#32cd32'],
        }],
    };

    const pieData = {
        labels: ['High', 'Medium', 'Low'],
        datasets: [{
            label: "Risk distribution",
            data: [riskCounts.High || 0, riskCounts.Medium || 0, riskCounts.Low || 0],
            backgroundColor: ['#ff4c4c', '#ffd700', '#32cd32'],
            hoverOffset: 30,
        }],
    };



    const filteredRecords = recordsWithParentEmails.filter((rec) =>
        filterRisk === "all" ? true : rec.risk === filterRisk
    );

    const generateEmailBody = (student) => {
        return `Dear Recipient,

Student Name: ${student.name}
Attendance: ${student.attendance}%
Marks Trend: ${student.marks_trend}
Fees Due: $${student.fees_due}

Please follow up as needed.`;
    };

    const openMailClient = (emails, subject, body, provider) => {
        const maxLength = 2000;
        let safeBody = body.length > maxLength ? body.slice(0, maxLength) + "..." : body;

        const encSubject = encodeURIComponent(subject);
        const encBody = encodeURIComponent(safeBody);
        const bccList = emails.join(",");

        let url = "";
        if (provider === "gmail") {
            url = `https://mail.google.com/mail/?view=cm&fs=1&bcc=${bccList}&su=${encSubject}&body=${encBody}`;
        } else if (provider === "outlook") {
            url = `mailto:?bcc=${bccList}&subject=${encSubject}&body=${encBody}`;
        } else {
            url = `mailto:?bcc=${bccList}&subject=${encSubject}&body=${encBody}`;
        }
        window.open(url, "_blank");
    };

    const sendBatchMails = (filter) => {
        let filteredStudents = [];
        let recipients = new Set();

        if (filter === "High") {
            filteredStudents = recordsWithParentEmails.filter((r) => r.risk === "High");
            filteredStudents.forEach((s) => {
                recipients.add(s.parent_email);
                recipients.add(s.mentor_email);
            });
        } else if (filter === "Medium") {
            filteredStudents = recordsWithParentEmails.filter((r) => r.risk === "Medium");
            filteredStudents.forEach((s) => {
                recipients.add(s.mentor_email);
            });
        }

        const recipientList = Array.from(recipients);
        if (recipientList.length === 0) {
            alert("No recipients found for selected risk category.");
            return;
        }

        const subject = "Student Risk Update";
        const body = filteredStudents.map(generateEmailBody).join("\n\n-----------\n\n");
        openMailClient(recipientList, subject, body, mailProvider);
    };

    return (
        <StyledDashboard>
            <h1>Student Risk Analysis Dashboard</h1>
            <UploadSection>
                <UploadCard
                    file={attendanceFile}
                    label="Attendance CSV"
                    onDrop={onDropHandler(setAttendanceFile)}
                    onDragOver={onDragOverHandler}
                    onFileChange={onChangeHandler(setAttendanceFile)}
                    onRemove={() => removeFileHandler(setAttendanceFile)}
                />
                <UploadCard
                    file={marksFile}
                    label="Marks CSV"
                    onDrop={onDropHandler(setMarksFile)}
                    onDragOver={onDragOverHandler}
                    onFileChange={onChangeHandler(setMarksFile)}
                    onRemove={() => removeFileHandler(setMarksFile)}
                />
                <UploadCard
                    file={feesFile}
                    label="Fees CSV"
                    onDrop={onDropHandler(setFeesFile)}
                    onDragOver={onDragOverHandler}
                    onFileChange={onChangeHandler(setFeesFile)}
                    onRemove={() => removeFileHandler(setFeesFile)}
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

                    <MailProviderSelector>
                        Select Mail Provider:&nbsp;
                        <label>
                            <input
                                type="radio"
                                name="mailProvider"
                                value="gmail"
                                checked={mailProvider === "gmail"}
                                onChange={() => setMailProvider("gmail")}
                            />
                            Gmail
                        </label>
                        <label>
                            <input
                                type="radio"
                                name="mailProvider"
                                value="outlook"
                                checked={mailProvider === "outlook"}
                                onChange={() => setMailProvider("outlook")}
                            />
                            Outlook
                        </label>
                    </MailProviderSelector>

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
                                    <CSVLink data={
                                        filterRisk === "all"
                                            ? analysisRecords
                                            : analysisRecords.filter((r) => r.risk === filterRisk)
                                    }
                                        filename={
                                            filterRisk === "all"
                                                ? "risk_analysis_all.csv"
                                                : `risk_analysis_${filterRisk.toLowerCase()}.csv`
                                        } style={{
                                            color: "black",
                                            textDecoration: "none",
                                            display: "block",
                                            width: "100%",
                                            textAlign: "center",
                                            cursor: "pointer",
                                        }}>
                                        <DownloadLink>Download CSV</DownloadLink>
                                    </CSVLink>
                                </Button>
                                {(filterRisk === "Medium" || filterRisk === "High") && (
                                    <Button onClick={() => sendBatchMails(filterRisk)}>
                                        {filterRisk === "Medium" ? "Send Mail to Mentors" : "Send Mail to Parents & Mentors"}
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


const UploadCard = ({ file, label, onDrop, onDragOver, onFileChange, onRemove }) => (
    <CardWrapper onDrop={onDrop} onDragOver={onDragOver} tabIndex={0} aria-label={`Upload ${label}`}>
        <div className="header">
            <h3>Upload Files</h3>
            <p>Drag & drop your files here</p>
        </div>
        <input type="file" accept=".csv" onChange={onFileChange} className="file-input" />
        <div className="upload-info">
            {file ? (
                <>
                    <p className="filename">{file.name}</p>
                    <p className="filesize">{(file.size / 1024).toFixed(2)} KB</p>
                    <RemoveButton type="button" aria-label={`Remove ${label}`} onClick={(e) => { e.stopPropagation(); onRemove(); }}>
                        &times;
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

const StyledDashboard = styled.div`
  color: #d3d3d3;
  background: #0f0f0f;
  min-height: 100vh;
  padding: 2rem;
  font-family: "Times New Roman", Times, serif;
  text-align: center;
  h1 {
  margin-bottom: 2rem;
  background: linear-gradient(90deg, #00ff75 5%, #29e4fd 45%, #2196f3 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-fill-color: transparent;
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
  cursor: pointer;
  color: #a0a0a0;
  transition: background-color 0.3s ease;

  /* Base inner border */
  border: 2px dashed transparent;
  padding: 1px; /* Needed for inner border space */

  &:hover,
  &:focus {
    background-color: #252525;
    outline: none;
  }

  /* Pseudo-element for gradient dotted border */
  &::before {
    content: "";
    position: absolute;
    top: -6px;
    left: -6px;
    right: -6px;
    bottom: -6px;
    border-radius: 30px; /* Slightly larger than 24px for visible border */
    padding: 3.5px; /* Thickness of the dotted border */
    pointer-events: none;

    border: 2px dotted transparent;
    border-image: linear-gradient(90deg, #00ff75 5%, #29e4fd 45%, #2196f3 100%);
    border-image-slice: 1;
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
    position: relative; /* keep above the pseudo-element */
    z-index: 1;
  }

  .file-input {
    position: absolute;
    top: 0;
    left: 0;
    opacity: 0;
    height: 100%;
    width: 100%;
    cursor: pointer;
    z-index: 1;
  }

  .upload-info {
    position: relative;
    bottom: 1.5rem;
    left: 1.5rem;
    right: 1.5rem;
    text-align: left;
    z-index: 1;
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
  display: block;
  width: 100%;
  text-align: center;

  &:hover {
    color: white;
    text-decoration: none !important;
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

const MailProviderSelector = styled.div`
  margin-top: 1rem;
  color: #d3d3d3;
  font-family: "Times New Roman", Times, serif;
  text-align: center;

  label {
    margin-left: 1rem;
    cursor: pointer;
    user-select: none;
  }

  input[type="radio"] {
    margin-right: 0.25rem;
    cursor: pointer;
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
  background-color: #ff4c4c !important;
  color: #000000ff;
}

tr.medium-risk {
  background-color: #ffd700 !important;
  color: #222;
}


  tr.low-risk {
  background-color: #32cd32 !important;
  color: #000000ff;
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
